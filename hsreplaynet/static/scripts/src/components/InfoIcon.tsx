import * as React from "react";
import Tooltip, {ClickTouch, TooltipContent} from "./Tooltip";

interface InfoIconProps {
	content?: TooltipContent | ClickTouch<TooltipContent>;
	header?: string;
	className?: string;
}

export default class InfoIcon extends React.Component<InfoIconProps, void> {
	render(): JSX.Element {
		return (
			<Tooltip
				className={"info-icon" + (this.props.className ? " " + this.props.className : "")}
				header={this.props.header}
				content={this.props.content}
			>
				<span className="glyphicon glyphicon-question-sign"/>
			</Tooltip>
		);
	}
}
