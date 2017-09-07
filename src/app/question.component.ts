import { Component, Input, Output, EventEmitter } from '@angular/core';

import { MdRadioChange } from '@angular/material';

import { Question } from './question';

@Component({
  selector: 'question',
  templateUrl: './question.component.html',
  styleUrls: ['./question.component.sass']
})
export class QuestionComponent {
	@Input() question: Question;
	@Output() answer = new EventEmitter();

	onAnswer(event: MdRadioChange) {
		this.answer.emit({
			question: this.question, 
			answer: this.question.choices[event.value]
		});
	}
}
