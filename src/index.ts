import { Project } from './project';
import CANNON = require('cannon');

window.addEventListener('DOMContentLoaded', () => {
  // Set global variable for cannonjs physics engine
  window.CANNON = CANNON;
  let project = new Project('renderCanvas');
  project.createScene();
  project.animate();
});



