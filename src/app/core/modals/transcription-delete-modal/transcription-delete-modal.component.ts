import {Component, OnInit, ViewChild} from '@angular/core';
import {BsModalRef, BsModalService, ModalOptions} from 'ngx-bootstrap';
import {Subject} from 'rxjs/Subject';
import {AppStorageService, SettingsService} from '../../shared/service';
import {SubscriptionManager} from '../../obj/SubscriptionManager';
import {BugReportService} from '../../shared/service/bug-report.service';
import {AppInfo} from '../../../app.info';

export enum ModalAnswer {
  DELETE = 'DELETE',
  ABORT = 'ABORT'
}

@Component({
  selector: 'app-transcription-delete-modal',
  templateUrl: './transcription-delete-modal.component.html',
  styleUrls: ['./transcription-delete-modal.component.css']
})

export class TranscriptionDeleteModalComponent implements OnInit {
  modalRef: BsModalRef;
  protected data = null;
  AppInfo = AppInfo;
  public visible = false;

  config: ModalOptions = {
    keyboard: false,
    backdrop: false,
    ignoreBackdropClick: false
  };

  @ViewChild('modal') modal: any;

  private actionperformed: Subject<ModalAnswer> = new Subject<ModalAnswer>();
  private subscrmanager = new SubscriptionManager();

  constructor(private modalService: BsModalService, private appStorage: AppStorageService,
              private bugService: BugReportService, private settService: SettingsService) {
  }

  ngOnInit() {
  }

  public open(): Promise<ModalAnswer> {
    return new Promise<ModalAnswer>((resolve, reject) => {
      this.modal.show(this.modal, this.config);
      this.visible = true;
      const subscr = this.actionperformed.subscribe(
        (action) => {
          resolve(action);
          subscr.unsubscribe();
        },
        (err) => {
          reject(err);
        }
      );
    });
  }

  public close(action: ModalAnswer) {
    this.modal.hide();
    this.visible = false;
    this.actionperformed.next(action);
  }
}
