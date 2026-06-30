import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class StudentsService {

  constructor(private http: HttpClient) { }

  getStudents(): Observable<StudentRecord[]> {
    return this.http.get<StudentRecord[]>('assets/tableConvert.com_vt6mh9.json');
  }

}
