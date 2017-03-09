import * as React from "react";
import {
	VictoryAxis, VictoryChart, VictoryContainer, VictoryLabel, VictoryLine,
	VictoryScatter, VictoryVoronoiTooltip, VictoryTooltip, VictoryArea
} from "victory";
import {RenderData} from "../../interfaces";
import {getChartMetaData, toTimeSeries, toDynamicFixed, sliceZeros} from "../../helpers";
import PopularityGradient from "./gradients/PopularityGradient";
import moment from "moment";

interface PopularityLineChartProps extends React.ClassAttributes<PopularityLineChart>{
	renderData: RenderData;
	maxYDomain: 10 | 100;
	widthRatio?: number;
}

export default class PopularityLineChart extends React.Component<PopularityLineChartProps, any> {
	private readonly colorMin = "rgba(0, 196, 255, 1.0)";
	private readonly colorMax = "rgba(255, 128, 0, 1.0)";

	constructor(props: PopularityLineChartProps, state: any) { super(props, state);
		this.state = {
			cursorPos: null,
		}
	}

	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);
		let content = null;

		if(this.props.renderData === "loading") {
			content = <VictoryLabel text={"Loading..."} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
		}
		else if (this.props.renderData === "error") {
			content = <VictoryLabel text={"Please check back later"} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
		}
		else if (this.props.renderData) {
			const series = toTimeSeries(this.props.renderData.series.find(x => x.name === "popularity_over_time") || this.props.renderData.series[0]);
			const metadata = getChartMetaData(series.data, undefined, true, 1);
			metadata.yDomain = [0, this.props.maxYDomain];

			const tooltip = <VictoryTooltip
				cornerRadius={0}
				pointerLength={0}
				padding={1}
				dx={d => d.x > metadata.xCenter ? -40 : 40}
				dy={-12}
				flyoutStyle={{
					stroke: "gray",
					fill: "rgba(255, 255, 255, 0.85)"
				}}
			/>;

			content = [
				<defs>
					<linearGradient id="popularity-gradient" x1="50%" y1="100%" x2="50%" y2="0%">
						<stop stopColor="rgba(255, 255, 255, 0)" offset={0}/>
						<stop stopColor="rgba(0, 128, 255, 0.6)" offset={1}/>
					</linearGradient>
				</defs>,
				<VictoryChart
					height={150}
					width={width}
					containerComponent={<VictoryContainer title={""}/>}
					domainPadding={{x: 0, y: 10}}
					domain={{x: metadata.xDomain, y: metadata.yDomain}}
					padding={{left: 40, top: 30, right: 20, bottom: 30}}
					>
					<VictoryAxis
						scale="time"
						tickValues={metadata.seasonTicks}
						tickFormat={tick => moment(tick).add(1, "day").format("MMMM")}
						style={{axisLabel: {fontSize: 8}, tickLabels: {fontSize: 8}, grid: {stroke: "gray"}, axis: {visibility: "hidden"}}}
					/>
					<VictoryAxis
						dependentAxis
						scale="sqrt"
						axisLabelComponent={<VictoryLabel dx={10} />}
						tickValues={this.props.maxYDomain == 10 ? [0, 0.5, 2, 5, 10] : [0, 5, 20, 50, 100]}
						tickFormat={tick => metadata.toFixed(tick) + "%"}
						style={{axisLabel: {fontSize: 8} ,tickLabels: {fontSize: 8}, grid: {stroke: d => d === metadata.yCenter ? "gray" : "lightgray"}, axis: {visibility: "hidden"}}}
					/>
					<VictoryArea
						data={series.data.map(p => {return {x: p.x, y: p.y, y0: metadata.yDomain[0]}})}
						style={{data: {fill: "url(#popularity-gradient)"}}}
						interpolation="monotoneX"
					/>
					<VictoryLine
						data={series.data}
						interpolation="monotoneX"
						style={{data: {strokeWidth: 1}}}
					/>
					<VictoryVoronoiTooltip
						data={series.data}
						labels={d => moment(d.x).format("YYYY-MM-DD") + "\n" + sliceZeros(toDynamicFixed(d.y, 2)) + "%"}
						labelComponent={tooltip}
						style={{
							labels: {fontSize: 6, padding: 5}
						}}
					/>
				</VictoryChart>
			];	
		}
		return (
			<svg viewBox={"0 0 " + width + " 150"}>
				{content}
				<VictoryLabel text={"Popularity - over time"} style={{fontSize: 10}} textAnchor="start" verticalAnchor="start" x={0} y={10}/>
			</svg>
		);
	}
}
