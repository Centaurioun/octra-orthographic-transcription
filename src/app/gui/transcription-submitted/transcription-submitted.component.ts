import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from "../../service/session.service";
import { TranscriptionService } from "../../service/transcription.service";
import { UserInteractionsService } from "../../service/userInteractions.service";
import { APIService } from "../../service/api.service";
import { ModalComponent } from "ng2-bs3-modal/components/modal";
import { AudioService } from "../../service/audio.service";
import { SubscriptionManager } from "../../shared";
import { isNullOrUndefined } from "util";
import { SettingsService } from "../../service/settings.service";


@Component({
	selector   : 'app-transcription-submitted',
	templateUrl: './transcription-submitted.component.html',
	styleUrls  : [ './transcription-submitted.component.css' ]
})
export class TranscriptionSubmittedComponent implements OnInit, OnDestroy, AfterViewInit {
	@ViewChild('success') success_modal: ModalComponent;

	private subscrmanager: SubscriptionManager;

	constructor(private router: Router,
				private sessService: SessionService,
				private tranService: TranscriptionService,
				private uiService: UserInteractionsService,
				private api: APIService,
				private audio: AudioService,
				private settService: SettingsService
	) {
		this.subscrmanager = new SubscriptionManager();
	}

	ngOnInit() {
	}

	ngAfterViewInit() {
	}

	ngOnDestroy() {
		this.subscrmanager.destroy();
	}

	leave() {
		this.clearData();
		this.sessService.clearLocalStorage();
		this.router.navigate([ '/logout' ]);
	}

	next() {
		this.subscrmanager.add(this.api.beginSession(this.sessService.member_project, this.sessService.member_id, Number(this.sessService.member_jobno), "")
			.subscribe((result) => {
				if (result != null) {
					let json = result.json();

					if (json.data && json.data.hasOwnProperty("url") && json.data.hasOwnProperty("id")) {
						this.clearData();
						this.sessService.audio_url = json.data.url;
						this.sessService.data_id = json.data.id;


						this.router.navigate([ '/user/load' ]);
					}
					else {
						this.openSuccessModal();
					}
				}
			}));
	}

	openSuccessModal() {
		this.success_modal.open();
	}

	clearData(){
		this.sessService.submitted = false;
		this.audio.audiobuffer = null;
		this.sessService.transcription = [];

		if(!isNullOrUndefined(this.tranService) && !isNullOrUndefined(this.tranService.segments))
			this.tranService.segments.clear();

		this.sessService.feedback = null;
		this.sessService.comment = "";
		this.sessService.logs = [];
		this.uiService.elements = [];
		this.settService.clearSettings();
	}
}
