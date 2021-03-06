import * as React from "react";
import * as _ from "lodash";
import CardData from "../CardData";
import CardSearch, {Limit} from "../components/CardSearch";
import ClassFilter, {FilterOption} from "../components/ClassFilter";
import DeckList from "../components/DeckList";
import InfoboxFilter from "../components/InfoboxFilter";
import InfoboxFilterGroup from "../components/InfoboxFilterGroup";
import NoDecksMessage from "../components/NoDecksMessage";
import PremiumWrapper from "../components/PremiumWrapper";
import ResetHeader from "../components/ResetHeader";
import DataManager from "../DataManager";
import {cardSorting, isWildSet, sortCards} from "../helpers";
import {DeckObj, FragmentChildProps, TableData} from "../interfaces";
import InfoboxLastUpdated from "../components/InfoboxLastUpdated";
import UserData from "../UserData";
import Fragments from "../components/Fragments";
import InfoIcon from "../components/InfoIcon";
import Tooltip from "../components/Tooltip";
import {decode as decodeDeckstring} from "deckstrings";

interface DeckDiscoverState {
	cardSearchExcludeKey?: number;
	cardSearchIncludeKey?: number;
	cards?: any[];
	filteredDecks: DeckObj[];
	loading?: boolean;
	showFilters?: boolean;
}

interface DeckDiscoverProps extends FragmentChildProps, React.ClassAttributes<DeckDiscover> {
	cardData: CardData;
	user: UserData;
	excludedCards?: string[];
	setExcludedCards?: (excludedCards: string[]) => void;
	gameType?: string;
	setGameType?: (gameType: string) => void;
	includedCards?: string[];
	setIncludedCards?: (includedCards: string[]) => void;
	opponentClasses?: FilterOption[];
	setOpponentClasses?: (opponentClasses: FilterOption[]) => void;
	account?: string;
	setAccount?: (account: string) => void;
	playerClasses?: FilterOption[];
	setPlayerClasses?: (playerClasses: FilterOption[]) => void;
	rankRange?: string;
	setRankRange?: (rankRange: string) => void;
	region?: string;
	setRegion?: (region: string) => void;
	timeRange?: string;
	setTimeRange?: (timeRange: string) => void;
	includedSet?: string;
	setIncludedSet?: (set: string) => void;
	archetypeSelector?: string;
}

export default class DeckDiscover extends React.Component<DeckDiscoverProps, DeckDiscoverState> {
	private readonly dataManager: DataManager = new DataManager();

	constructor(props: DeckDiscoverProps, state: DeckDiscoverState) {
		super(props, state);
		this.state = {
			cardSearchExcludeKey: 0,
			cardSearchIncludeKey: 0,
			cards: null,
			filteredDecks: [],
			loading: true,
			showFilters: false,
		};
		this.updateFilteredDecks();
	}

	componentDidUpdate(prevProps: DeckDiscoverProps, prevState: DeckDiscoverState) {
		if (
			this.props.excludedCards !== prevProps.excludedCards ||
			this.props.gameType !== prevProps.gameType ||
			this.props.includedCards !== prevProps.includedCards ||
			!_.eq(this.props.opponentClasses, prevProps.opponentClasses) ||
			this.props.account !== prevProps.account ||
			!_.eq(this.props.playerClasses, prevProps.playerClasses) ||
			this.props.rankRange !== prevProps.rankRange ||
			this.props.region !== prevProps.region ||
			this.props.timeRange !== prevProps.timeRange ||
			this.props.cardData !== prevProps.cardData ||
			this.props.includedSet !== prevProps.includedSet
		) {
			this.updateFilteredDecks();
		}
	}

	componentWillReceiveProps(nextProps: DeckDiscoverProps) {
		if (!this.state.cards && nextProps.cardData) {
			const cards = [];
			nextProps.cardData.all().forEach((card) => {
				if (card.name && card.collectible && ["MINION", "SPELL", "WEAPON"].indexOf(card.type) !== -1) {
					cards.push(card);
				}
			});
			cards.sort(cardSorting);
			this.setState({cards});
		}
	}

	getDeckType(totalCost: number): string {
		return totalCost >= 100 ? "control" : (totalCost >= 80 ? "midrange" : "aggro");
	}

	getDeckElements(): Promise<any[]> {
		const deckElements = [];
		const playerClasses = this.props.playerClasses;
		const filteredCards = (key: string): any[] => {
			const array = this.props[key] || [];
			if (array.length === 1 && !array[0]) {
				return [];
			}
			const cards = [];
			array.forEach((dbfId) => {
				const index = cards.findIndex((obj) => {
					return obj.card && +obj.card.dbfId === +dbfId;
				});
				if (index !== -1) {
					cards[index].count++;
				}
				else {
					cards.push({
						card: this.props.cardData.fromDbf(dbfId),
						count: 1,
					});
				}
			});
			return cards;
		};
		const includedCards = filteredCards("includedCards");
		const excludedCards = filteredCards("excludedCards");
		const missingIncludedCards = (deckList: any[]) => {
			return includedCards.some((includedCardObj) => {
				return includedCardObj && deckList.every((cardObj) => {
						return cardObj && cardObj.card.id !== includedCardObj.card.id || cardObj.count < includedCardObj.count
					});
			});
		};
		const containsExcludedCards = (deckList: any[]) => {
			return excludedCards.some((excludedCardObj) => {
				return excludedCardObj && deckList.some((cardObj) => cardObj.card.id === excludedCardObj.card.id)
			});
		};
		const cardList = (cards) => cards.map((c: any[]) => {
			return {card: this.props.cardData.fromDbf(c[0]), count: c[1]};
		});
		const pushDeck = (deck: any, cards: any[]) => {
			deck.cards = cards;
			deckElements.push(deck);
		};
		if (this.props.account
			&& this.props.user.isPremium()
			&& this.props.user.hasFeature("personal-deck-stats")) {
			const params = this.getPersonalParams();
			if (!this.dataManager.has("single_account_lo_decks_summary", params)) {
				this.setState({loading: true});
			}
			return this.dataManager.get("single_account_lo_decks_summary", params).then(((data: TableData) => {
				if (data && data.series) {
					Object.keys(data.series.data).forEach((playerClass) => {
						data.series.data[playerClass].forEach((deck) => {
							const cards = cardList(JSON.parse(deck.deck_list));
							if (missingIncludedCards(cards) || containsExcludedCards(cards)) {
								return;
							}
							if (
								this.props.includedSet !== "ALL" &&
								cards.every((cardObj) => cardObj.card.set !== this.props.includedSet)
							) {
								return;
							}
							deck.player_class = playerClass;
							pushDeck(deck, cards);
						});
					});
				}
				return deckElements;
			}));
		}
		else {
			const params = this.getParams();
			const query = this.getQueryName();
			if (!this.dataManager.has(query, params)) {
				this.setState({loading: true});
			}
			return this.dataManager.get(query, params).then((deckData) => {
				const newParams = this.getParams();
				if (Object.keys(params).some((key) => params[key] !== newParams[key])) {
					return Promise.reject("Params changed");
				}

				const data = deckData.series.data;
				Object.keys(data).forEach((key) => {
					if (playerClasses.length && playerClasses.indexOf(key as FilterOption) === -1) {
						return;
					}
					data[key].forEach((deck) => {
						const cards = cardList(JSON.parse(deck.deck_list));
						if (missingIncludedCards(cards) || containsExcludedCards(cards)) {
							return;
						}
						if (
							this.props.includedSet !== "ALL" &&
							cards.every((cardObj) => cardObj.card.set !== this.props.includedSet)
						) {
							return;
						}
						deck.player_class = key;
						pushDeck(deck, cards);
					});
				});
				return deckElements;
			});
		}
	}

	updateFilteredDecks(): void {
		if (!this.props.cardData) {
			return;
		}
		this.getDeckElements().then(((deckElements) => {
			const decks: DeckObj[] = [];
			deckElements.forEach((deck) => {
				let winrate = deck.win_rate;
				let numGames = deck.total_games;
				const opponents = this.props.opponentClasses;
				if (opponents && opponents.length) {
					numGames = opponents.reduce((x: number, playerClass: FilterOption) => {
						return x + deck["total_games_vs_" + playerClass];
					}, 0);
					winrate = opponents.map((playerClass) =>
							[
								deck["total_games_vs_" + playerClass],
								deck["win_rate_vs_" + playerClass],
							],
						).reduce((a: number, b) => a + b[0] * b[1], 0) / numGames;
				}
				decks.push({
					cards: deck.cards,
					deckId: deck.deck_id,
					duration: deck.avg_game_length_seconds,
					numGames,
					playerClass: deck.player_class,
					winrate,
				});
			});
			this.setState({filteredDecks: decks, loading: false});
		})).catch((reason) => {
			if (reason !== "Params changed" && reason !== 202) {
				console.error(reason);
			}
		});
	}

	render(): JSX.Element {
		let content = null;
		if (this.state.loading) {
			content = <h3 className="message-wrapper">Loading…</h3>;
		}
		else if (this.state.filteredDecks.length === 0) {
			if (this.props.account && this.props.user.hasFeature("personal-deck-stats")) {
				content = (
					<NoDecksMessage>
						<button
							className="btn btn-default"
							type="button"
							onClick={() => this.props.setAccount(null)}
						>
							Back to the decks
						</button>
					</NoDecksMessage>
				);
			}
			else {
				content = (
					<div className="content-message">
						<h2>No decks found</h2>
						<button className="btn btn-default" type="button" onClick={() => this.props.reset()}>
							Reset filters
						</button>
					</div>
				);
			}
		}
		else {
			content = (
				<Fragments
					defaults={{
						sortBy: "popularity",
						sortDirection: "descending",
						page: 1,
					}}
				>
					<DeckList
						decks={this.state.filteredDecks}
						pageSize={12}
						helpMessage="Decks require at least 1000 recorded games in the selected time frame to be listed."
						showArchetypeSelector={this.props.archetypeSelector === "show"}
						dataManager={this.dataManager}
						user={this.props.user}
					/>
				</Fragments>
			);
		}

		const filterClassNames = ["infobox full-sm"];
		const contentClassNames = ["deck-list-wrapper"];
		if (!this.state.showFilters) {
			filterClassNames.push("hidden-xs hidden-sm");
		}
		else {
			contentClassNames.push("hidden-xs hidden-sm");
		}

		const backButton = (
			<button
				className="btn btn-primary btn-full visible-sm visible-xs"
				type="button"
				onClick={() => this.setState({showFilters: false})}
			>
				Back to deck list
			</button>
		);

		let personalFilters = null;
		if (this.props.user.hasFeature("personal-deck-stats")) {
			const accounts = [];
			this.props.user.getAccounts().forEach((acc) => {
				accounts.push(
					<InfoboxFilter value={acc.region + "-" + acc.lo}>
						{acc.display}
					</InfoboxFilter>,
				);
			});
			if (accounts.length === 0) {
				const message = this.props.user.isPremium() ? "No account found" : "My Account";
				const help = this.props.user.isPremium() && (
						<span className="infobox-value">
						<Tooltip
							header="No Hearthstone account found"
							content={
								<div>
									<p>Play one (more) game and upload the replay for your account to appear here.</p>
									<br />
									<p>Please contact us if this problem remains! (click)</p>
								</div>
							}
						>
							<a href="/contact/">help</a>
						</Tooltip>
					</span>
					);
				accounts.push(
					<InfoboxFilter value="undefined" locked>
						{message}
						{help}
					</InfoboxFilter>,
				);
			}
			personalFilters = (
				<PremiumWrapper isPremium={this.props.user.isPremium()}>
					<InfoboxFilterGroup
						deselectable
						header="Played with"
						selectedValue={this.props.account}
						onClick={(value) => this.props.setAccount(value)}
						tabIndex={accounts.length > 1 ? 0 : -1}
					>
						{accounts}
					</InfoboxFilterGroup>
				</PremiumWrapper>
			);
		}

		const selectedCards = (key: string) => {
			if (!this.props.cardData || !this.props[key]) {
				return undefined;
			}
			let cards = this.props[key].map((dbfId) => this.props.cardData.fromDbf(dbfId));
			cards = cards.filter((card) => !!card);
			return cards;
		};

		let filteredCards = Array.isArray(this.state.cards) ? this.state.cards : [];
		const gameType = this.props.gameType;
		if (gameType.endsWith("_STANDARD")) {
			filteredCards = filteredCards.filter((card) => !isWildSet(card.set));
		}
		const playerClasses = this.props.playerClasses;
		if (playerClasses.length) {
			filteredCards = filteredCards.filter((card) => {
				const cardClass = card.cardClass;
				return cardClass === "NEUTRAL" || playerClasses.indexOf(cardClass) !== -1;
			});
		}

		const isPremium = !!this.props.user.isPremium();
		const premiumTabIndex = isPremium ? 0 : -1;

		return (
			<div className="deck-discover">
				<div className={filterClassNames.join(" ")} id="deck-discover-infobox">
					{backButton}
					<ResetHeader
						onReset={() => this.props.reset()}
						showReset={this.props.canBeReset}
					>
						Decks
					</ResetHeader>
					<section id="player-class-filter">
						<h2>
							Player Class
							<InfoIcon
								className="pull-right"
								header="Player Class Restriction"
								content={{
									click: (
										<p>
											Only show decks for specific classes.&nbsp;
											<span>Hold <kbd>Ctrl</kbd> to select multiple classes.</span>
										</p>
									),
									touch: "Only show decks for specific classes.",
								}}
							/>
						</h2>
						<ClassFilter
							filters="All"
							hideAll
							minimal
							multiSelect
							selectedClasses={this.props.playerClasses}
							selectionChanged={(selected) => this.props.setPlayerClasses(selected)}
						/>
					</section>
					<section id="opponent-class-filter">
						<PremiumWrapper
							name="Deck List Opponent Selection"
							isPremium={isPremium}
							infoHeader="Winrate by Opponent"
							infoContent={
								<p>
									See how various decks perform against a specific class at a glance!
								</p>
							}>
							<h2>Opponent class</h2>
							<ClassFilter
								filters="All"
								hideAll
								minimal
								multiSelect
								tabIndex={premiumTabIndex}
								selectedClasses={this.props.opponentClasses}
								selectionChanged={(selected) => this.props.setOpponentClasses(selected)}
							/>
						</PremiumWrapper>
					</section>
					<section id="include-cards-filter">
						<h2 id="card-search-include-label">Included Cards</h2>
						<InfoboxFilterGroup
							deselectable
							selectedValue={this.props.includedSet}
							onClick={(value) => this.props.setIncludedSet(value || "ALL")}
						>
							<InfoboxFilter value="UNGORO">Latest Expansion</InfoboxFilter>
						</InfoboxFilterGroup>
						<CardSearch
							id="card-search-include"
							label="card-search-include-label"
							key={"cardinclude" + this.state.cardSearchIncludeKey}
							availableCards={filteredCards}
							onCardsChanged={(cards) => this.props.setIncludedCards(cards.map((card) => card.dbfId))}
							selectedCards={selectedCards("includedCards")}
							cardLimit={Limit.NORMAL}
							onPaste={this.props.user.hasFeature("deckstrings") ? (e) => {
								const input = e.clipboardData.getData("text/plain");
								const lines = input.trim().split("\n").filter((line) => !line.startsWith("#"));
								let result = null;
								try {
									result = decodeDeckstring(lines[0]);
								}
								catch (e) {
									return;
								}
								e.preventDefault();
								const cards = [];
								for (let tuple of result.cards) {
									const [dbfId, count] = tuple;
									for (let i = 0; i < count; i++) {
										cards.push(this.props.cardData.fromDbf(dbfId));
									}
								}
								cards.sort(sortCards);
								this.props.setIncludedCards(cards.map((card) => card.dbfId));
							} : null}
						/>
					</section>
					<section id="exclude-cards-filter">
						<h2 id="card-search-exclude-label">Excluded Cards</h2>
						<CardSearch
							id="card-search-exclude"
							label="card-search-exclude-label"
							key={"cardexclude" + this.state.cardSearchExcludeKey}
							availableCards={filteredCards}
							onCardsChanged={(cards) => this.props.setExcludedCards(cards.map((card) => card.dbfId))}
							selectedCards={selectedCards("excludedCards")}
							cardLimit={Limit.SINGLE}
						/>
					</section>
					{personalFilters}
					<section id="game-mode-filter">
						<h2>Game Mode</h2>
						<InfoboxFilterGroup
							selectedValue={this.props.gameType}
							onClick={(value) => this.props.setGameType(value)}
						>
							<InfoboxFilter value="RANKED_STANDARD">Ranked Standard</InfoboxFilter>
							<InfoboxFilter value="RANKED_WILD">Ranked Wild</InfoboxFilter>
						</InfoboxFilterGroup>
					</section>
					<section id="time-frame-filter">
						<PremiumWrapper
							name="Deck List Time Frame"
							isPremium={isPremium}
							infoHeader="Time Frame"
							infoContent="Want to see which decks are hot right now? Look at data from a time frame of your choosing!"
						>
							<h2>Time frame</h2>
							<InfoboxFilterGroup
								locked={!this.props.user.isPremium()}
								selectedValue={this.props.timeRange}
								onClick={(value) => this.props.setTimeRange(value)}
								tabIndex={premiumTabIndex}
							>
								<InfoboxFilter value="CURRENT_SEASON">Current Season</InfoboxFilter>
								<InfoboxFilter value="LAST_3_DAYS">Last 3 days</InfoboxFilter>
								<InfoboxFilter value="LAST_7_DAYS">Last 7 days</InfoboxFilter>
								<InfoboxFilter value="LAST_30_DAYS">Last 30 days</InfoboxFilter>
							</InfoboxFilterGroup>
						</PremiumWrapper>
					</section>
					<section id="rank-range-filter">
						<PremiumWrapper
							name="Deck List Rank Range"
							isPremium={isPremium}
							infoHeader="Rank Range"
							infoContent="Ready to climb the ladder? Check out how decks perform at certain rank ranges!"
						>
							<h2>Rank range</h2>
							<InfoboxFilterGroup
								locked={!this.props.user.isPremium()}
								selectedValue={this.props.rankRange}
								onClick={(value) => this.props.setRankRange(value)}
								tabIndex={premiumTabIndex}
							>
								<InfoboxFilter value="LEGEND_ONLY">Legend only</InfoboxFilter>
								<InfoboxFilter value="LEGEND_THROUGH_FIVE">Legend–5</InfoboxFilter>
								<InfoboxFilter value="LEGEND_THROUGH_TEN">Legend–10</InfoboxFilter>
								<InfoboxFilter value="ALL">Legend–25</InfoboxFilter>
							</InfoboxFilterGroup>
						</PremiumWrapper>
					</section>
					<section id="side-bar-data">
						<h2>Data</h2>
						<ul>
							<InfoboxLastUpdated
								dataManager={this.dataManager}
								url={this.getQueryName()}
								params={this.getParams()}
							/>
						</ul>
					</section>
					{backButton}
				</div>
				<div className={contentClassNames.join(" ")}>
					<button
						className="btn btn-default pull-left visible-xs visible-sm"
						type="button"
						onClick={() => this.setState({showFilters: true})}
					>
						<span className="glyphicon glyphicon-filter" />
						Filters
					</button>
					{content}
				</div>
			</div>
		);
	}

	getQueryName(): string {
		return this.props.user.isPremium() ? "list_decks_by_opponent_win_rate" : "list_decks_by_win_rate";
	}

	getParams(): any {
		return {
			GameType: this.props.gameType,
			RankRange: this.props.rankRange,
			TimeRange: this.props.timeRange,
			// Region: this.props.region,
		};
	}

	getPersonalParams(props?: DeckDiscoverProps): any {
		props = props || this.props;
		const getRegion = (account: string) => account && account.split("-")[0];
		const getLo = (account: string) => account && account.split("-")[1];
		return {
			GameType: props.gameType,
			Region: getRegion(props.account),
			account_lo: getLo(props.account),
		};
	}
}
