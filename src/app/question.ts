export class Question {
	id: string;
	text: string;
	choices: QuestionChoice[];
}

export class QuestionChoice {
	text: string | undefined;
	value: any;
	wrong: boolean | undefined;

	constructor(value: any, text?: string, wrong: boolean = false) {
		this.value = value;
		if (text) this.text = text;
		if (wrong !== undefined) this.wrong = wrong;
	}
}