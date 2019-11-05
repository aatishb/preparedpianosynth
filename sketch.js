// simulates the physics of a vibrating string
// with a mass attached at a specific position
// increasing the mass creates inharmonic sounds
// moving the mass changes the spectrum / timbre

const closest = x => e => Math.abs(e - x);
const min = (a,b) => a < b ? a : b;
const max = (a,b) => a > b ? a : b;
const sum = (a,b) => a + b;
const ascending = (a,b) => a - b;
let allRoots = [];

let sliderArray = [];
let mSlider, lSlider, oSlider;
let context;

let waveCoefficients;
let epsilon = 0.001;

let oscArray = [];
let envArray = [];

let numPartials = 7;
let amps = new Float32Array(numPartials);

let t = 0;
let m0 = 0;
let l0 = 0.7;

let freq;

let notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
let octaves = [3, 4, 5];
let noteLabels = [];
let keyboard;

let oscsStarted = false;

function setup() {
  keyboard = select('#keyboard');
  var canvas = createCanvas(
    max(windowWidth,700),
    0.9 * max(windowHeight,400) - keyboard.height
  );
  canvas.parent('sketch-holder');
  canvas.style('display', 'block');

 	noteLabels = octaves
    .map(octave => notes.map(note => note + octave))
    .reduce(concat);


  colorMode(HSB);
  textSize(15);
  background(10);
  rectMode(CORNER);

  initSliders();
  initKeys();
  updateSliders();
  findAllRoots();
}

function draw() {
  drawString(t); // passing position
  t += 0.005;
}

function initOscs() {

  context = getAudioContext();

	for (let i=0; i< numPartials; i++) {

    env = new p5.Envelope();
    env.setExp(true);
    envArray.push(env);

    osc = new p5.Oscillator();
  	osc.setType('sine');
	  osc.amp(env);
  	osc.start();
    oscArray.push(osc);


  }

}


function initSliders() {

  fill(255);
  noStroke();
  for (let i=0; i<numPartials; i++) {

    let slider;

    if(!sliderArray[i]) {
      let v = 100 * Math.sin((i+1)*PI*0.1)/((i+1)*Math.sin(PI*0.1));
	    slider = createSlider(0, 100, v);
    } else { slider = sliderArray[i]; }

    text('n = ' + str(i+1), 10, map(i,0,numPartials-1,(height+50)/2, height - 50/2));
    slider.position(50, map(i,0,numPartials-1,(height+50)/2, height - 50/2)
      - slider.height/2);
    slider.changed(updateSliders);

    if(!sliderArray[i]) {
	    sliderArray.push(slider);
    }

    slider.addClass('slider');

  }

  if (!mSlider) {
	  mSlider = createSlider(0, 100, 100*m0);
  }
  mSlider.position(width/4 + 25, 3*height/4 - height/8  + 15);
	text('mass', width/4 + 25, 3*height/4 - height/8);
  mSlider.changed(findAllRoots);
  mSlider.addClass('slider');

  if (!lSlider) {
	  lSlider = createSlider(10, 90, 100*l0);
  }
  lSlider.position(width/4 + 25, 3*height/4 + height/8 + 15);
  lSlider.changed(findAllRoots);
  lSlider.addClass('slider');

	text('position', width/4 + 25, 3*height/4 + height/8);

  if (!oSlider) {
	  oSlider = createSlider(-2, 0, -1);
  }
  oSlider.position(width/4 + 25, 3*height/4 + 15);
	text('octave', width/4 + 25, 3*height/4 );
  oSlider.changed(initKeys);
  oSlider.addClass('slider');

}

function updateSliders() {

  for (let i=0; i<numPartials; i++) {
    amps[i] = sliderArray[i].value()/100;
  }

  calculateCoefficients(l0);
  if(freq) {tuneOscs(freq);}

}

function findAllRoots() {

  m0 = mSlider.value()/100;
  l0 = lSlider.value()/100;
  allRoots = findNRoots(m0, l0, numPartials);
  drawSpectrum(m0,l0);

  calculateCoefficients(l0);

  if(freq) {tuneOscs(freq);}

}

function findNRoots(m, l, N) {

	let roots = [];
  let x = 0.1;

	while (roots.length < N) {
		let findRoot = rootFinder(m, l, x);

		if (roots.length == 0 ||
				(findRoot > 0 && roots.map(closest(findRoot)).reduce(min) > 0.01)
			 ) {
			roots.push(findRoot);
		} else {
			x += 0.1;
		}
	}

  return roots.sort(ascending);
}

function rootFinder(m, l, z0) {

	let z = z0;
	let epsilon = Math.pow(10,-6);

	while (Math.abs(equation(m, l, z)) > epsilon) {
		z = z - 0.01 * equation(m, l, z)/derivative(m, l, z);
	}

	return z;

}

function equation(m, l, z) {
	return m * Math.sin(l * z) * Math.sin(z * (l - 1))
		+ Math.sin(z)/z;
}

function derivative(m, l, z) {
	return Math.cos(z)/z - Math.sin(z)/(z*z)
		- 0.5 * m * (Math.sin(z) + (2 * l - 1) * Math.sin(z * (1 - 2*l)));
}


function calculateCoefficients(l) {

  waveCoefficients = [];
  dwaveCoefficients = [];

  let normAmps = sqrt(amps.map(e => e * e).reduce(sum));
  let maxAmps = amps.reduce(max);
	let normWaves = allRoots.map(z => normalize(l,z));
  let f = 1;

  for (let x = 0; x <= 1; x += 0.01) {
		y = 0;
    dy = 0;
    i = 0;

    let waveCoeffs = [];

		for (let z of allRoots) {

     	c = Math.sin(z * l) / Math.sin(z * (l - 1));

	    if (x <= l) {
  	  	waveCoeffs.push((maxAmps/normAmps) * (amps[i] * Math.sin(z * x) / normWaves[i]));
    	} else {
     		waveCoeffs.push((maxAmps/normAmps) * (amps[i] * c * Math.sin(z * (x-1)) / normWaves[i]));
      }

      i++;
    }

    waveCoefficients.push(waveCoeffs);
  }

}

function drawString(t) {
  fill(10);
  noStroke();
	rect(0,0,width/2, height/2);
	rect(width/2, height/2, width/2, height/2);
  fill(255);
  text('String Animation', width/4 - 50, 35);
  text('Waveform', 3*width/4 - 25, height - 35);
  stroke(255);
  strokeWeight(2);
  noFill();

  let f = 1;

  beginShape();
  let x = 0;
  for (let c of waveCoefficients) {
    let x0 = map(x, 0, 1, 50/2, (width-50)/2);
    let y0 = 0;
	  let i = 0;
  	for (let z of allRoots) {
      y0 += c[i] * Math.sin(2*f*z*t);
      i++;
    }
    y0 = map(0.2 * y0, -1, 1, (height-50)/2, 50/2, true);
    vertex(x0,y0);

    if (Math.abs(m0) > epsilon && Math.abs(x-l0) < epsilon) {
      fill(255);
      ellipse(x0, y0, 24*m0);
      noFill();
    }
    x += 0.01;
  }
  endShape();

  beginShape();
  for (let t0 = 0; t0 <= 1; t0 += 0.001) {
    let dt = map(t0, 0, 1, (width+50)/2, width - 25);
    let dy = 0;
    i = 0;
  	for (let z of allRoots) {
      dy += amps[i] * Math.sin(2*f*z*(4*(t0 - 1) + t));
      i++;
    }
    dy = map(1.5*dy, -2*numPartials, 2*numPartials, height - 25, (height+50)/2, true);
    vertex(dt,dy);
  }
  endShape();


}

function drawSpectrum(m,l) {

  noStroke();
  fill(10);
  rect(width/2, 0, width/2, height/2);
  fill(255)
  text('Frequency Spectrum vs Mass Position', 3*width/4 - 130, 35);


  for (let l = 0.1; l <= 0.9; l += 0.02) {
    let myRoots = findNRoots(m, l, numPartials);
    let col = 0;
    for (let root of myRoots) {
      let x = map(l, 0, 1, width/2, width);
      let y = map(root, -1, numPartials*PI, 50 + (height - 50)/2, 50 + 50/2);
      fill(map(col,0,myRoots.length,0,360),255,255);
      ellipse(x, y, 5);
      col++;
    }
  }

  stroke(255);
  let x0 = map(l, 0, 1, width/2, width);
  line(x0,50 + (height - 50)/2, x0, 50 + 50/2);
}

function normalize(l, z) {

	return Math.sqrt(
		( 2 * z * l - Math.sin(2 * z * l)
   		+ Math.pow( Math.sin(z * l) / Math.sin(z * (l - 1)) , 2) * (2 * z * (1 - l) - Math.sin(2 * z * (1 - l)) )
  	)/(4*z)
	);

}

function initKeys() {
  let i = 60 + 12 * oSlider.value();
  for (let note of noteLabels) {
    let key = select('#' + note);
    key.midi = i;
    key.originalColor = key.style('background-color');
    key.mouseClicked(playNote);
    i++;
  }
}



// A function to play a note
function playNote() {

  if (!oscsStarted) {
    initOscs();
    oscsStarted = true;
  }

  freq = midiToFreq(this.midi)
  tuneOscs(freq);
}


function tuneOscs(f) {


  let maxAmp = amps.reduce(max);

  if (maxAmp > 0) {

    let maxCoeff = amps.map(e => abs(e)).reduce(max);
    let vol = amps.map(e => 0.5 * e * maxAmp / maxCoeff);

    let i=0;
    for (let osc of oscArray) {

      let volume = abs(vol[i]);
      let phase = vol[i] > 0 ? 0.5 : 0;

      if (volume > epsilon) {
	      osc.freq(f * allRoots[i]/PI);
        osc.phase(phase);
        let decayTime = max(PI/allRoots[i], 0);
        envArray[i].setADSR(0.002, 0, 1, 6.91 * decayTime, 0, 0);
				// attack time, decay time, sustain level, release time
        // why 6.91? See https://ccrma.stanford.edu/~jos/st/Audio_Decay_Time_T60.html
        env.setRange(vol[i], 0); // attack level, release level = 0
  	    envArray[i].play(osc, 0, 0);
      }

      i++;
    }
  }
}

function windowResized() {
  resizeCanvas(
    max(windowWidth,700),
    0.9 * max(windowHeight,400) - keyboard.height
  );
  background(10);
  initSliders();
	drawSpectrum(m0,l0);
}
