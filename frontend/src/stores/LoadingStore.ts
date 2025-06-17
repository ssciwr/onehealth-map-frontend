import { action, makeObservable, observable } from "mobx";

// indicate to the user throughout the app that data is being requested, etc.
class LoadingStore {
	@observable isLoading = false;
	@observable progress = 0;

	constructor() {
		makeObservable(this);
	}

	@action start = () => {
		this.isLoading = true;
		this.progress = 0;
	};

	@action setProgress = (value: number) => {
		this.progress = Math.min(Math.max(value, 0), 100);
	};

	@action complete = () => {
		this.progress = 100;
		setTimeout(() => {
			this.isLoading = false;
			this.progress = 0;
		}, 300);
	};

	@action staticStart = () => {
		this.isLoading = true;
		this.progress = 30;
	};

	@action continuousStart = () => {
		this.isLoading = true;
		this.progress = 20;

		const interval = setInterval(() => {
			if (this.progress >= 90) {
				clearInterval(interval);
				return;
			}
			this.setProgress(this.progress + Math.random() * 10);
		}, 500);
	};
}

export const loadingStore = new LoadingStore();
