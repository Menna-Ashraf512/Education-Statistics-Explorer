import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Headerbar } from "./features/dashboard/components/headerbar/headerbar";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Headerbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Education-Statistics-Explorer');
}
