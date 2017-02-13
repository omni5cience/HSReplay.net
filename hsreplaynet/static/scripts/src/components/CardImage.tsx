import * as React from "react";

interface CardImageState {
	url: string;
}

interface CardImageProps extends React.ClassAttributes<CardImage> {
	cardId: string;
	placeholder: string;
}

export default class CardImage extends React.Component<CardImageProps, CardImageState> {
	constructor(props: CardImageProps, state: CardImageState) {
		super(props, state);
		this.state = {
			url: props.placeholder,
		}
		this.fetchImage();
	}

	fetchImage() {
		const url = "http://media.services.zam.com/v1/media/byName/hs/cards/enus/" + this.props.cardId + ".png"
		const image = new Image();
		image.onload = () => this.setState({url: url})
		image.src = url;
	}

	render(): JSX.Element {
		return (
			<a className="card-image" href={"/cards/" + this.props.cardId}>
				<img src={this.state.url} height={350}/>
			</a>
		);
	}
}