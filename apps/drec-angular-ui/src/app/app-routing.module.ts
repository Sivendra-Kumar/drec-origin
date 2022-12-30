import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WithloginlayoutComponent } from './nav/withloginlayout/withloginlayout.component';
import { WithoutloginlayoutComponent } from './nav/withoutloginlayout/withoutloginlayout.component';
import { AlldevicesComponent } from './view/alldevices/alldevices.component';
import { LoginComponent } from './view/login/login.component';
import { RegisterComponent } from './view/register/register.component';
import { CertificateComponent } from './view/certificate/certificate.component';
import {
  MyreservationComponent
} from './view/myreservation/myreservation.component'

const routes: Routes = [


  { path: '', redirectTo: 'login', data: { title: 'First Component' }, pathMatch: 'full' },

  {
    path: '', component: WithoutloginlayoutComponent, data: { title: 'First Component' },
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
    ]
  },
  {
    path: '', component: WithloginlayoutComponent,
    children: [
      { path: '', redirectTo: 'AllDevices', pathMatch: 'full' },
      { path: 'AllDevices', component: AlldevicesComponent },
      { path: 'certificate', component: CertificateComponent },
       { path: 'certificate/:id', component: CertificateComponent },
      { path: 'myreservation', component: MyreservationComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
