import { Component, OnInit, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';

import { Observable, Subject, BehaviorSubject } from 'rxjs/Rx';
import 'rxjs/add/observable/fromEvent';

import { Question, QuestionChoice } from './question';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.sass'],
	encapsulation: ViewEncapsulation.None
})
// TODO Extract some logic to components
export class AppComponent implements OnInit {
	static MONTHS: string[] = [
		'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
	];
	static DAYS_OF_WEEK: string[] = [
		'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
	];

	static initQuestionTemplates(): object[] {
		const now = new Date();
		const nowYear = now.getFullYear();
		const nowMonth = now.getMonth();
		const nowDate = now.getDate();
		const nowDecade = Math.floor(nowYear / 10) * 10;

		// FIXME Adaptive (eg, day of month rage depends on month, no future dates)
		return [
			{
				id: 'decade',
				text: 'In which decade were you born?',
				choices: AppComponent
					.choiceRange(nowDecade - 120, nowDecade, 10)
			},
			{
				id: 'yearInDecade',
				text: 'What year?',
				// year depends on decade
				choices: answers =>  AppComponent
					.someAnswerOf(answers, 'decade')
					.map(d => AppComponent
						.choiceRange(0, Math.min(9, nowYear - d.value), 1, 
							yd => '’' + (d.value + yd).toString().slice(-2)))
			},
			{
				id: 'month',
				text: 'What is your birth month?',
				choices: answers => Observable.combineLatest(
					AppComponent.someAnswerOf(answers, 'decade'),
					AppComponent.someAnswerOf(answers, 'yearInDecade'),
					(d, yd) => AppComponent.choiceTexts(AppComponent.MONTHS)
						.filter(x => 
							d.value + yd.value < nowYear 
							|| x.value <= nowMonth))
			},
			{
				id: 'dayOfMonth',
				text: 'What is the day of your birth?',
				// day range depends on decade+year and month
				choices: answers => Observable.combineLatest(
					AppComponent.someAnswerOf(answers, 'decade'),
					AppComponent.someAnswerOf(answers, 'yearInDecade'),
					AppComponent.someAnswerOf(answers, 'month'),
					(d, yd, m) => AppComponent
						.choiceRange(1, new Date(
							d.value + yd.value, 
							m.value + 1, 
							0).getDate())
						.filter(x => 
							d.value + yd.value < nowYear 
							|| m.value < nowMonth 
							|| x.value < nowDate))
			},
			{
				id: 'dayOfWeek',
				text: 'On which day of the week were you born?',
				choices: answers => Observable.combineLatest(
					AppComponent.someAnswerOf(answers, 'decade'),
					AppComponent.someAnswerOf(answers, 'yearInDecade'),
					AppComponent.someAnswerOf(answers, 'month'),
					AppComponent.someAnswerOf(answers, 'dayOfMonth'),
					(d, yd, m, dm) => {
						const correctDay = new Date(
							d.value + yd.value, 
							m.value, 
							dm.value).getDay()
						return AppComponent
							.choiceTexts(AppComponent.DAYS_OF_WEEK)
							.map(x => Object.assign({}, x, 
								{wrong: x.value !== correctDay}))
					})
			},
			{
				id: 'looseTime',
				text: 'What was the time of day when you were born?',
				choices: AppComponent.choiceTexts(['Morning', 'Noon', 'Afternoon', 'Evening', 'Night', 'Midnight', "Don't know"])
			}
		];
	}

	static questionTemplates: any[] = AppComponent.initQuestionTemplates();
	
	answers: Subject<QuestionChoice|null>[] = AppComponent.questionTemplates.map(_ => new BehaviorSubject(null));
	questions: Observable<Question>[] = AppComponent.questionTemplates.map(x =>
		this.generateQuestion(x));

	result: Observable<number>;

	wrongAnswer: Observable<boolean>;

	nextPage: Subject<{}> = new Subject();
	pageNumber: Observable<number>;

	nextButtonVisible: Observable<boolean>;
	nextButtonEnabled: Observable<boolean>;
	nextButtonIcon: Observable<string>;

	shareText: Observable<string>;

	@ViewChild('buttonNext', {read: ElementRef}) buttonNext: ElementRef;

	ngOnInit(): void {
		this.pageNumber = this.nextPage.startWith({}).map((_,i) => i).publishBehavior(0).refCount();
		const questionsMaxPage = 1 + AppComponent.questionTemplates.length-1;
		const analysisPage = questionsMaxPage + 1;
		const maxPage = analysisPage + 2;

		const currentQuestionId = this.pageNumber.map(x => {
			const index = x - 1;
			if (index >= 0 && index < AppComponent.questionTemplates.length) {
				return AppComponent.questionTemplates[index].id;
			} else {
				return '';
			}
		});

		this.wrongAnswer = currentQuestionId.flatMap(x => x 
			? this.answerOf(x).map(y => y !== null && y.wrong) 
			: Observable.of(false));

		this.nextButtonVisible = this.pageNumber.map(x => 
			x <= questionsMaxPage);
		this.nextButtonEnabled = currentQuestionId.flatMap(x => x 
			? this.answerOf(x).map(y => y !== null && !y.wrong) 
			: Observable.of(true));
		this.nextButtonIcon = this.pageNumber.map(x => 
			x == questionsMaxPage ? 'done' : 'arrow_forward');

		this.result = Observable.combineLatest(this.answers)
			.map(x => Object.assign({}, ...Object.keys(x).
				map(k => ({[AppComponent.questionTemplates[k].id]: x[k]}))))
			.filter(x => AppComponent.questionTemplates
				.every(q => x[q.id] !== null))
			.map(AppComponent.analyze)
			.publish().refCount();

		// Automatically flip on analysis page
		this.pageNumber.subscribe(x => {
			if (x === analysisPage) {
				setTimeout(_ => this.nextPage.next({}), 2000);
			}
		});

		this.shareText = this.result.map(x => 
			"Wow, my true age is actually " + x + "?!"
			+ " Find out your true age by taking this quiz now!");
	}

	onClickNext(event: any): void {
		this.nextPage.next(event);
	}

	onAnswer(event: any): void {
		const question = event.question;
		this.answerOf(question.id).next(event.answer);
	}


	generateQuestion(questionTemplate: any): Observable<Question> {
		if (questionTemplate.choices instanceof Function) {
			return questionTemplate.choices(this.answers)
				.map(choices => {
					return {
						id: questionTemplate.id,
						text: questionTemplate.text,
						choices: choices
					};
				})
				.startWith({
					id: questionTemplate.id,
					text: questionTemplate.text,
					choices: []
				});
		} else {
			return Observable.of({
				id: questionTemplate.id,
				text: questionTemplate.text,
				choices: questionTemplate.choices
			});
		}
	}


	answerOf(id: string): Subject<QuestionChoice|null> {
		return AppComponent.answerOf(this.answers, id);
	}

	static answerOf(answers: Subject<QuestionChoice|null>[], id: string): Subject<QuestionChoice|null> {
		return answers[AppComponent.idToIndex(id)];
	}

	static someAnswerOf(answers: Subject<QuestionChoice|null>[], id: string): Observable<QuestionChoice> {
		return answers[AppComponent.idToIndex(id)].filter(x => x !== null);
	}

	static idToIndex(id: string): number {
		return AppComponent.questionTemplates.findIndex(x => x.id === id);
	}
 
 	static analyze(answers: object): number {
 		const birthYear = answers['decade'].value + answers['yearInDecade'].value;
 		const birthMonth = answers['month'].value;
 		const birthDate = answers['dayOfMonth'].value;

 		const now = new Date();
 		const nowMonth = now.getMonth();

 		let age = now.getFullYear() - birthYear;
 		if (nowMonth < birthMonth 
 			|| (nowMonth == birthMonth && now.getDate() < birthDate)) {
 			age--;
 		}
 		return age;
 	}


	static choiceRange(min: number, max: number, step = 1, textFunc?: (value: number) => string): QuestionChoice[] {
		return Array((max - min) / step + 1).fill(0).map((_,i) => {
			const choice: QuestionChoice = new QuestionChoice(min + i * step);
			if (textFunc) choice.text = textFunc(choice.value);
			return choice;
		});
	}

	static choiceTexts(texts: string[]): QuestionChoice[] {
		return texts.map((x, i) => new QuestionChoice(i, x));
	}
}
