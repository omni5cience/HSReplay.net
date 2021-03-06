import * as React from "react";
import HideLoading from "./loading/HideLoading";
import DataInjector from "./DataInjector";
import DataManager from "../DataManager";
import Tooltip from "./Tooltip";
import SemanticAge from "./SemanticAge";
import PropRemapper from "./utils/PropRemapper";

interface InfoboxLastUpdatedProps {
	dataManager: DataManager;
	fetchCondition?: boolean;
	params: any;
	url: string;
}

export default class InfoboxLastUpdated extends React.Component<InfoboxLastUpdatedProps, void> {
	render(): JSX.Element {
		return (
			<li>
				Last updated
				<span className="infobox-value">
					<Tooltip
						header="Automatic updates"
						content="This page is periodically updated as new data becomes available."
					>
						<DataInjector
							dataManager={this.props.dataManager}
							fetchCondition={this.props.fetchCondition}
							query={{url: this.props.url, params: this.props.params}}
							modify={(data) => data && data.as_of ? new Date(data.as_of) : null}
						>
							<HideLoading>
								<PropRemapper map={{data: "date"}}>
									<SemanticAge />
								</PropRemapper>
							</HideLoading>
						</DataInjector>
					</Tooltip>
				</span>
			</li>
		);
	}
}
