import * as React from "react";
import {
	VictoryAxis, VictoryArea, VictoryChart, VictoryContainer, VictoryLabel,
	VictoryLine, VictoryVoronoiTooltip, VictoryTooltip
} from "victory";
import {ChartSeries} from "../../interfaces";
import {getChartMetaData, toTimeSeries} from "../../helpers";
import WinLossGradient from "./gradients/WinLossGradient";
import moment from "moment";

interface WinrateLineChartProps {
	series: ChartSeries;
	widthRatio?: number;
}

export default class WinrateLineChart extends React.Component<WinrateLineChartProps, any> {
	render(): JSX.Element {
		const width = 150 * (this.props.widthRatio || 3);
		let content = null;
		let timespan = null;

		if (this.props.series) {
			const series = toTimeSeries(this.props.series);
			const metadata = getChartMetaData(series.data, 50, true);

			timespan = "last " + moment.duration((+metadata.xMinMax[1].x - +metadata.xMinMax[0].x)/1000, "seconds").humanize();

			const tooltip = (
				<VictoryTooltip
					cornerRadius={0}
					pointerLength={0}
					padding={1}
					dx={d => d.x > metadata.xCenter ? -40 : 40}
					dy={-12}
					flyoutStyle={{
						stroke: "gray",
						fill: "rgba(255, 255, 255, 0.85)"
					}}
				/>
			);

			content = [
				<defs>
					<WinLossGradient id="winrate-by-time-gradient" metadata={metadata} />
				</defs>,
				<VictoryChart
					height={150}
					width={width}
					containerComponent={<VictoryContainer title={""}/>}
					padding={{left: 40, top: 30, right: 20, bottom: 30}}
					domain={{x: metadata.xDomain, y: metadata.yDomain}}
					domainPadding={{x: 0, y: 15}}
					>
					<VictoryAxis
						scale="time"
						tickValues={metadata.seasonTicks}
						tickFormat={tick => tick === metadata.seasonTicks[0] ? "Last season" : "This season"}
						style={{axisLabel: {fontSize: 8}, tickLabels: {fontSize: 8}, grid: {stroke: "gray"}, axis: {visibility: "hidden"}}}
					/>
					<VictoryAxis
						dependentAxis
						axisLabelComponent={<VictoryLabel dx={10} />}
						tickValues={[50].concat(metadata.yDomain)}
						tickFormat={tick => tick + "%"}
						style={{axisLabel: {fontSize: 8} ,tickLabels: {fontSize: 8}, grid: {stroke: d => d === 50 ? "gray" : "transparent"}, axis: {visibility: "hidden"}}}
					/>
					<VictoryArea
						data={series.data.map(p => {return {x: p.x, y: p.y, y0: 50}})}
						style={{data: {fill: "url(#winrate-by-time-gradient)"}}}
						interpolation="basis"
					/>
					<VictoryLine
						data={series.data}
						interpolation="basis"
						style={{data: {strokeWidth: 1}}}
					/>
					<VictoryVoronoiTooltip
						data={series.data}
						labels={d => moment(d.x).format("YYYY-MM-DD") + "\n" + d.y + "%"}
						labelComponent={tooltip}
						style={{
							labels: {fontSize: 6, padding: 5}
						}}
					/>
				</VictoryChart>
			];
		}
		else {
			content = <VictoryLabel text={"Loading..."} style={{fontSize: 14}} textAnchor="middle" verticalAnchor="middle" x={width/2} y={75}/>
		}

		return (
			<svg viewBox={"0 0 " + width + " 150"}>
				{content}
				<VictoryLabel text={"Winrate" + (timespan ? " - " + timespan : "")} style={{fontSize: 10}} textAnchor="start" verticalAnchor="start" x={0} y={10}/>
			</svg>
		);
	}
}