import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { MdIconModule, MdToolbarModule, MdTabsModule, MdCardModule, MdButtonModule, MdRadioModule, MdProgressBarModule } from '@angular/material';

import { ShareButtonsModule } from 'ngx-sharebuttons';

import { AppComponent } from './app.component';
import { QuestionComponent } from './question.component';
import { AgeComponent } from './age.component';

@NgModule({
  declarations: [
    AppComponent, QuestionComponent, AgeComponent
  ],
  imports: [
    HttpModule, BrowserModule, BrowserAnimationsModule,
    MdIconModule, MdToolbarModule, MdTabsModule, MdCardModule, MdButtonModule, MdRadioModule, MdProgressBarModule,
    ShareButtonsModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
