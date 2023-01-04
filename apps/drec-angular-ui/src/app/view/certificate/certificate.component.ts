

import { FormBuilder } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { MediaMatcher } from '@angular/cdk/layout';
import { Component, ViewChild, ViewChildren, QueryList, ChangeDetectorRef, OnInit } from '@angular/core';
// import { NavItem } from './nav-item';
import { MatTableDataSource, MatTable } from '@angular/material/table';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { AuthbaseService } from '../../auth/authbase.service';
import { Router,ActivatedRoute, Params } from '@angular/router';

export interface Student {
  firstName: string;
  lastName: string;
  studentEmail: string;
  course: string;
  yearOfStudy: number;

}
@Component({
  selector: 'app-certificate',
  templateUrl: './certificate.component.html',
  styleUrls: ['./certificate.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class CertificateComponent implements OnInit {


  displayedColumns = ['serialno','certificateStartDate', 'certificateEndDate','owners'];
   innerDisplayedColumns = ['certificate_issuance_startdate','certificate_issuance_enddate','deviceid', 'readvalue_watthour'];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  dataSource: MatTableDataSource<any>;
  data:any;
  group_uid: string;
  energyurl:any;
  group_name:any;
  
  constructor(private authService: AuthbaseService, private router: Router, private activatedRoute: ActivatedRoute) {

    this.activatedRoute.queryParams.subscribe(params => {
      this.group_uid = params['id'];
      this.group_name = params['name'];
     
  });
   }
  ngOnInit() {
    this.energyurl="https://volta-explorer.energyweb.org/tx/";
    console.log("myreservation");
    this.DisplayList()
  }
  // ngAfterViewInit() {
  //   this.dataSource.paginator = this.paginator;
  //   this.dataSource.sort = this.sort;
  // }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
  DisplayList() {
    this.authService.GetAllProducts('certificate-log/issuer/certified/'+this.group_uid).subscribe(
      (data) => {
        // display list in the console 
        console.log(data)
        this.data = data;
       // this.dataSource = new MatTableDataSource(this.data);
        //this.dataSource.paginator = this.paginator
      }
    )
  }
}

