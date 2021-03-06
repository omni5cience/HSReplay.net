import * as React from "react";
import $ from "jquery";
import {Colors} from "../../Colors";
import MatrixBody from "./MatrixBody";
import {SelectableProps} from "../../interfaces";
//import {EvaluatedArchetype} from "../../pages/ArchetypeClient";

interface MatrixProps extends SelectableProps, React.ClassAttributes<Matrix> {
	matrix: NumberMatrix;
	sampleSize?: number;
	colorScheme?: Colors;
	intensity?: number;
	working?: boolean;
	popularities?: any;
}

export interface NumberMatrix {
	[key: string]: NumberRow;
}

export interface NumberRow {
	[key: string]: Matchup;
}

export interface Matchup {
	f_wr_vs_o: number|null;
	friendly_wins: number;
	is_mirror: boolean;
	match_count: number;
}

export interface Cell {
	ratio: number|null;
	mirror?: boolean;
}

interface MatrixState {
	highlight?: number[];
	hideBoring?: boolean;
	hovering?: number[];
	tooltipX?: number;
	tooltipY?: number;
}

const mult = 30;

const cellOffsetX = 150;
const rightMarginX = 90;
const cellOffsetY = 150;

export default class Matrix extends React.Component<MatrixProps, MatrixState> {

	private ref: any;

	constructor(props: MatrixProps, context: any) {
		super(props, context);

		this.state = {
			highlight: [],
			hideBoring: true,
			hovering: [],
			tooltipX: 0,
			tooltipY: 0,
		};
	}

	public render(): JSX.Element {
		let titles = [];
		let selections = [];
		let rowcount = 0;
		let cellcount = 0;
		const width = this.archetypes.length * mult;

		let games = [];

		let archetypeList = [];

		// count pass
		$.each(this.archetypes, (index: number, outer: string) => {

			if (!games[outer]) {
				games[outer] = 0;
			}

			const row: NumberRow = this.props.matrix[outer];
			$.each(this.archetypes, (index: number, inner: string) => {

				if (!games[inner]) {
					games[inner] = 0;
				}

				const matchup: any = row[inner];
				const matches = matchup.match_count;
				const is_cutoff = matchup.match_count < this.props.sampleSize;
				if (!is_cutoff) {
					games[outer] += matches;
					games[inner] += matches;
				}
			});

			archetypeList.push(outer);
		});

		let index = 0;
		let cells = [];

		let tooltipHeading = null;
		let tooltipText = null;

		// render pass
		$.each(this.archetypes, (i: number, key: string) => {
			let classNames = ["archetype"];
			const class1 = key;

			if (!games[key]) {
				classNames.push("boring");
			}

			let hClassNames = classNames.slice();
			let vClassNames = classNames.slice();

			if (this.state.highlight.indexOf(index) === 0) {
				vClassNames.push("interesting");
			}

			if (this.state.highlight.lastIndexOf(index) === 1) {
				hClassNames.push("interesting");
			}

			if (this.props.select === key) {
				hClassNames.push("selected");
			}

			let row: NumberRow = this.props.matrix[key];
			let cellRow: Cell[] = [];
			let j = 0;
			$.each(row, (class2: string, matchup: Matchup) => {
				const valid = matchup.match_count >= this.props.sampleSize;
				const ratio = valid ? matchup.f_wr_vs_o : null;

				if (this.state.hovering.length === 2 && this.state.hovering[0] === j && this.state.hovering[1] === i) {
					tooltipHeading = class1 + " vs. " + class2;
					let title = "";

					if (matchup.is_mirror) {
						title += "\nMirror matchup (" + matchup.match_count + " games)";
					}
					else {
						if (!valid) {
							if (this.props.sampleSize > 0) {
								title += "\nNot enough games";
								title += " (" + matchup.match_count + " of " + this.props.sampleSize + ")";
							}
							else {
								title += "\nNo game";
							}
						}
						else {
							let winrate = (matchup.f_wr_vs_o * 100).toFixed(2) + "%";
							winrate += " (won " + matchup.friendly_wins + "/" + matchup.match_count + ")";
							title += "\nWinrate: " + winrate;
						}
					}

					tooltipText = title;
				}
				cellRow.push({
					ratio: ratio,
					mirror: matchup.is_mirror,
				});

				j++;
			});
			cells.push(cellRow);

			if (this.props.onSelect) {
				hClassNames.push("selectable");
			}

			titles.push(<text
				key={"h" + rowcount}
				x={cellOffsetX + -mult / 4}
				y={cellOffsetY + rowcount * mult}
				textAnchor="end"
				dominantBaseline={"middle"}
				transform={"translate(0 " + mult / 2 + ")"}
				className={hClassNames.join(" ")}
				onClick={() => {
					if(!this.props.onSelect) {
						return
					}
					this.props.onSelect(key);
				}}
			>{class1}</text>);

			titles.push(<text
				key={"v" + rowcount}
				x={rowcount * mult + cellOffsetX}
				y={cellOffsetY}
				textAnchor="start"
				dominantBaseline={"middle"}
				transform={"translate(" + (-1.7 * mult) + " " + (cellOffsetY - mult / 3)+ ") rotate(315" +
				 " " + rowcount * mult +" 0)"}
				className={vClassNames.join(" ")}
			>{class1 + (this.props.popularities[class1] ? " (" + (this.props.popularities[class1] * 100).toFixed(1) + "%)" : "")}</text>);

			if (this.props.select === key) {
				selections.push(<rect
					x={cellOffsetX}
					y={cellOffsetY + rowcount * mult}
					height={mult}
					width={width}
				/>);
			}

			index++;
			rowcount++;
		});

		const dimensions = this.getSVGDimensions();

		const tooltip = tooltipText ? <div
			className="matrix-tooltip"
			style={{top: this.state.tooltipY + "px", left: this.state.tooltipX + "px"}}
		><strong>{tooltipHeading}</strong><br />{tooltipText}</div> : null;

		return (
			<div
				className="component-matrix"
				onMouseMove={(e: any) => {
					if(!this.ref) {
						return;
					}

					const rect = this.ref.getBoundingClientRect();
					this.setState({tooltipX: e.clientX - rect.left, tooltipY: e.clientY - rect.top + 20});
				}}
			>
			<svg
				viewBox={"0 0 " + dimensions[0] + " " + dimensions[1]}
				ref={(ref) => {
						this.ref = ref;
					}}
				onMouseMove={(e) => this.hover(e.clientX, e.clientY)}
				onTouchStart={(e) => this.touch(e)}
				onTouchMove={(e) => this.touch(e)}
				onMouseLeave={() => this.clearHighlight()}
				onTouchCancel={() => this.clearHighlight()}
				onTouchEnd={() => this.clearHighlight()}
				className={this.props.working ? "loading" : null}
			>
				<g>{titles}</g>
				<g className="cells"><MatrixBody
					cells={cells}
					colors={this.props.colorScheme}
					intensity={this.props.intensity}
					offsetX={cellOffsetX}
					offsetY={cellOffsetY}
					edge={mult}
					onClick={(x: number, y: number): void => {
							if(!this.props.onSelect) {
								return
							}
							this.props.onSelect(archetypeList[y]);
						}}
					onHoverStart={(x: number, y: number): void => this.setState({hovering: [x, y]})}
					onHoverEnd={(x: number, y: number): void => this.setState({hovering: []})}
				/></g>
				<g className="selections">{selections}</g>
			</svg>
				{tooltip}
			</div>
		);
	}

	public shouldComponentUpdate(nextProps: MatrixProps, nextState: MatrixState, nextContext: any): boolean {
		if (nextState.highlight.length !== this.state.highlight.length) {
			return true;
		}
		for (let i = 0; i < nextState.highlight.length; i++) {
			if (nextState.highlight[i] !== this.state.highlight[i]) {
				return true;
			}
		}
		return true;
	}

	private get archetypes(): string[] {
		return Object.keys(this.props.matrix);
	}

	private getSVGDimensions(): number[] {
		return [
			this.archetypes.length * mult + cellOffsetX + rightMarginX,
			this.archetypes.length * mult + cellOffsetY,
		];
	}

	private touch(e): void {
		if (!e.touches[0]) {
			return;
		}

		const touch = e.touches[0];
		this.hover(touch.clientX, touch.clientY);
	}

	private hover(clientX: number, clientY: number): boolean {
		if (!this.ref) {
			return false;
		}

		const rect = this.ref.getBoundingClientRect();
		const dimensions = this.getSVGDimensions();

		const correctionX = dimensions[0] / rect.width;
		const correctionY = dimensions[1] / rect.height;

		const pxOffsetX = clientX - rect.left;
		const pxOffsetY = clientY - rect.top;

		const offsetX = pxOffsetX * correctionX - cellOffsetX;
		const offsetY = pxOffsetY * correctionY - cellOffsetY;

		const max = this.archetypes.length * mult;

		/*if (offsetX < 0 || offsetX > max || offsetY < 0 || offsetY > max) {
		 this.clearHighlight();
		 return false;
		 }*/

		const rowX = Math.floor(offsetX / mult);
		const rowY = Math.floor(offsetY / mult);

		this.setState({
			highlight: [rowX, rowY],
		});

		return true;
	}

	private clearHighlight(): void {
		this.setState({
			highlight: [],
		})
	}
}
