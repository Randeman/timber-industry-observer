import { Component, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from 'src/app/api.service';
import { FileUpload } from '../file.upload';
import { FileUploadService } from '../file.upload.service';
import { delay } from 'rxjs/operators';
import { of } from 'rxjs/internal/observable/of';

@Component({
  selector: 'app-edit-report',
  templateUrl: './edit-report.component.html',
  styleUrls: ['./edit-report.component.css']
})
export class EditReportComponent implements OnInit, OnDestroy {

  reportData;
  reportId;
  viewVector: boolean = false;
  coordinates: string = "";
  interactionMode: boolean = false;
  setInteractions = new EventEmitter<null>;
  removeInteractions = new EventEmitter<null>;
  currentFileUpload?: FileUpload;
  violationOptions: Array<string[]> = [['logging', "Незаконен дърводобив"], ['transport', "Незаконен транспорт"], ['trash', "Замърсяване"], ['other', "Друго"]];
  urls: string[] = [];
  files: File[] = [];
  district: string;
  municipality: string;
  land: string;
  id: any;


  setCoordinates(coordinates: string) {
    this.coordinates = coordinates;
    if (!!coordinates) {
      this.getLocation(coordinates);
    }
  }

  onSetInteractions() {
    this.setInteractions.emit(null);
    this.interactionMode = !this.interactionMode;
  }

  onDeleteInteractions() {
    this.removeInteractions.emit(null);
    this.interactionMode = !this.interactionMode;
    this.district = "";
    this.municipality = "";
    this.land = "";
  }


  constructor(
    private apiService: ApiService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private uploadService: FileUploadService) { }
  
  
    ngOnInit(): void {
      this.reportId = this.activatedRoute.snapshot.params["reportId"];
      this.apiService.getReport(this.reportId).subscribe({
        next: data => {
          this.reportData = data;
          this.urls = this.reportData.images || [];
        }});


  }


  onReport(form: NgForm) {
    if (form.invalid) return;

    const user = JSON.parse(sessionStorage.getItem('user'));
    const { coordinates, violation, description, district, municipality, land } = form.value;
    const [gps_lat, gps_lon] = coordinates.split(", ");
    const currentUrls = this.urls.slice(0, this.urls.length - this.files.length);

    if(!!this.files.length){
      of(this.upload()).pipe(
        delay(10000),
      ).subscribe(() =>
        this.apiService.editReport(this.reportId, {
          gps_lat, gps_lon, violation, description, district, municipality, land, 
          images: [...this.uploadService.uploadUrls, ...currentUrls], author: user.uid,
          createdAt: this.reportData.createdAt, updatedAt: new Date().toISOString()
        })
      );
    } else{
      this.apiService.editReport(this.reportId, {
        gps_lat, gps_lon, violation, description, district, municipality, land, 
        images: this.urls, author: user.uid,
        createdAt: this.reportData.createdAt, updatedAt: new Date().toISOString()
      })
    }

    this.router.navigate(['/observer']);
  }

  detectFiles(event) {
    const files = event.target.files;
    if (files) {
      for (let file of files) {
        let reader = new FileReader();
        reader.onload = (e: any) => {
          this.urls.push(e.target.result);
          this.files.push(file);
        }
        reader.readAsDataURL(file);
      }
    }
  }

  deleteImage(url: any, index): void {
    this.urls = this.urls.filter((x, i) => x !== url || i !== index);
    this.files = this.files.filter((x, i) => i !== index);
  }

  upload() {
    if (this.files) {
      this.uploadService.pushFileToStorage(this.files);
    };
    this.files = [];
    this.urls = [];
  }

  getLocation(coordinates: string) {
    this.apiService.getPlace(coordinates).subscribe(data => {
      this.district = data["postalCodes"]["0"] ? `${data["postalCodes"]["0"]["adminName1"]}` || "Няма данни" : "Няма данни";
      this.municipality = data["postalCodes"]["0"] ? data["postalCodes"]["0"]["adminName2"] || "Няма данни" : "Няма данни";
      this.land = data["postalCodes"]["0"] ? data["postalCodes"]["0"]["placeName"] || "Няма данни" : "Няма данни";
    })
  }

  ngOnDestroy(): void {
    this.onDeleteInteractions();
  
  }



}
