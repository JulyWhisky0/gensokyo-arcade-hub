import './styles/portal.css';
import { GensokyoPortalApp } from './portal/app';

const appRoot = document.getElementById('app');
if (appRoot) {
  new GensokyoPortalApp(appRoot);
}
