import {
	Component, OnInit, Output, AfterViewInit, ViewChild, OnDestroy, ChangeDetectionStrategy,
	ChangeDetectorRef, OnChanges
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import { SessionService } from "../../service/session.service";
import { UserInteractionsService } from "../../service/userInteractions.service";
import { AudioService } from "../../service/audio.service";
import { TranscriptionService } from "../../service/transcription.service";
import { ModalComponent } from 'ng2-bs3-modal/ng2-bs3-modal';
import { Observable, Subscription } from "rxjs";
import { ComponentCanDeactivate } from "../../guard/login.deactivateguard";
import { APIService } from "../../service/api.service";
import { Functions } from "../../shared/Functions";
import { NavbarService } from "../../service/navbar.service";
import { SubscriptionManager } from "../../shared";
import { TranslateService } from "@ngx-translate/core";
import { SettingsService } from "../../service/settings.service";
import { isNullOrUndefined } from "util";
import { Control } from "../../shared/FeedbackForm/Control";


@Component({
	selector       : 'app-transcription-submit',
	templateUrl    : './transcription-submit.component.html',
	styleUrls      : [ './transcription-submit.component.css' ]
})
export class TranscriptionSubmitComponent implements OnInit, ComponentCanDeactivate, OnDestroy, AfterViewInit, OnChanges {

	@ViewChild('modal') modal: ModalComponent;
	@ViewChild('modal2') modal2: ModalComponent;
	@ViewChild('fo') form: NgForm;

	constructor(public sessService: SessionService,
				public router: Router,
				public transcrService: TranscriptionService,
				public api: APIService,
				public cd: ChangeDetectorRef,
				public sanitizer: DomSanitizer,
				public navbarServ: NavbarService,
				private langService: TranslateService,
				private settingsService: SettingsService
	) {

		this.subscrmanager = new SubscriptionManager();
	}

	private send_ok = false;
	public send_error: string = "";
	private subscrmanager: SubscriptionManager;

	public t:string = "";

	ngOnInit() {
		if (!this.transcrService.segments && this.sessService.SampleRate) {
			this.transcrService.loadSegments(this.sessService.SampleRate);
		}

		if(isNullOrUndefined(this.sessService.feedback)) {
			console.error("feedback is null!");
		}

		this.navbarServ.show_interfaces = false;
		this.navbarServ.show_export = false;
	}

	canDeactivate(): Observable<boolean> | boolean {
		return this.send_ok;
	}

	public back() {
		this.transcrService.feedback.comment = this.transcrService.feedback.comment.replace(/(<)|(\/>)|(>)/g, "\s");
		this.sessService.comment = this.transcrService.feedback.comment;

		console.log(this.transcrService.feedback);
		this.sessService.save("feedback", this.transcrService.feedback.exportData());
		this.router.navigate([ '/user/transcr' ]);
	}

	onSubmit(form: NgForm) {
		this.transcrService.feedback.comment = this.transcrService.feedback.comment.replace(/(<)|(\/>)|(>)/g, "\s");
		this.sessService.comment = this.transcrService.feedback.comment;
		this.sessService.save("feedback", this.transcrService.feedback.exportData());
		this.modal.open();
	}

	onSendNowClick() {
		this.modal.dismiss();
		this.modal2.open();
		this.send_ok = true;

		let json: any = this.transcrService.exportDataToJSON();

		this.subscrmanager.add(this.api.saveSession(json.transcript, json.project, json.annotator, json.jobno, json.id, json.status, json.comment, json.quality, json.log)
			.catch(this.onSendError)
			.subscribe((result) => {
					if (result != null && result.hasOwnProperty("statusText") && result.statusText === "OK") {
						console.log("gesendet mit id" + json.id);
						this.sessService.submitted = true;
						this.modal2.close();
						setTimeout(() => {
							this.router.navigate([ '/user/transcr/submitted' ])
						}, 1000);
					}
					else {
						this.send_error = this.langService.instant("send error");
					}
				}
			));
	}

	ngAfterViewInit() {
		setTimeout(()=>{
			jQuery.material.init();
		}, 100);
	}

	onSendError = (error) => {
		this.send_error = error.message;
		return Observable.throw(error);
	};

	ngOnDestroy() {
		this.navbarServ.show_interfaces = this.settingsService.projectsettings.navigation.interfaces;
		this.navbarServ.show_export = this.settingsService.projectsettings.navigation.export;
		this.subscrmanager.destroy();
	}

	ngOnChanges(obj){
		if(!isNullOrUndefined(obj.form)){
		}

		jQuery.material.init();
	}

	getURI(format: string): string {
		let result: string = "";

		switch (format) {
			case("text"):
				result += "data:text/plain;charset=UTF-8,";
				result += encodeURIComponent(this.transcrService.getTranscriptString("text"));
				break;
			case("annotJSON"):
				result += "data:application/json;charset=UTF-8,";
				result += encodeURIComponent(this.transcrService.getTranscriptString("annotJSON"));
				break;
		}

		return result;
	}

	sanitize(url: string) {
		return this.sanitizer.bypassSecurityTrustUrl(url);
	}

	test(){
	}

	onControlValueChange(control:Control, value:any){
		let custom = {};
		if(control.type.type === "checkbox"){
			value = (value) ? control.value : "";
			custom["checked"] = !control.custom["checked"];
		}
		let result = this.transcrService.feedback.setValueForControl(control.name, value.toString(), custom);
	}

	getLabelTranslation(languages:any, lang:string):string{
		if(isNullOrUndefined(languages[lang])){
			for(let attr in languages){
				//take first
				return languages[attr];
			}
		}
		return languages[lang];
	}
}
