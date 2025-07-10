import { action, makeObservable, observable } from "mobx";

interface ErrorInfo {
	title: string;
	message: string;
	timestamp: number;
}

// Store for displaying alerts without too much code duplication
class ErrorStore {
	@observable currentError: ErrorInfo | null = null;
	@observable isVisible = false;

	constructor() {
		makeObservable(this);
	}

	@action showError = (title: string, message: string) => {
		this.currentError = {
			title,
			message,
			timestamp: Date.now(),
		};
		this.isVisible = true;
	};

	@action hideError = () => {
		this.isVisible = false;
		// Clear error after animation completes
		setTimeout(() => {
			if (!this.isVisible) {
				this.currentError = null;
			}
		}, 300);
	};

	@action clearError = () => {
		this.currentError = null;
		this.isVisible = false;
	};
}

export const errorStore = new ErrorStore();
