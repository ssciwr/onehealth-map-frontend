import { makeObservable, observable, action } from 'mobx';

class ViewingModeStore {
    @observable isExpert = false;
    @observable isCitizen = false;

    constructor() {
        makeObservable(this);
    }

    @action setExpert = (value: boolean) => {
        this.isExpert = value;
    };

    @action setCitizen = (value: boolean) => {
        this.isCitizen = value;
    };

    @action toggleExpert = () => {
        this.isExpert = !this.isExpert;
    };

    @action toggleCitizen = () => {
        this.isCitizen = !this.isCitizen;
    };

    @action toggleMode = () => {
        this.isExpert = this.isCitizen;
        this.isCitizen = !this.isCitizen;
    }
}

export const viewingMode = new ViewingModeStore();