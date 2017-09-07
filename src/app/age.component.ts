import { Component, Input } from '@angular/core';

@Component({
	selector: 'age',
	templateUrl: './age.component.html',
	styleUrls: ['./age.component.sass']
})
export class AgeComponent {
	@Input() age: number;
}