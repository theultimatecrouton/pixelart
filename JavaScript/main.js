var canvasDiv = document.getElementById("d1");
var canvas = document.getElementById("gridCanvas");
// var ctx = canvas.getContext("2d");

// create a class for our grid
var Grid = function(cell_size, num_cells, cnv, div){
  this.canvas = cnv;
  this.ctx = this.canvas.getContext("2d");
  this.div = div;

  this.cell_size = cell_size;
  this.num_cells = num_cells;
  this.coloured_cells = [];

  this.min_x = (this.canvas.width - num_cells*cell_size)/2;
  this.min_y = (this.canvas.height - num_cells*cell_size)/2;
  this.max_x = this.min_x + this.num_cells*this.cell_size;
  this.max_y = this.min_y + this.num_cells*this.cell_size;
}

// draw the gridlines
Grid.prototype.draw = function(cells_to_draw=this.num_cells, is_full_grid=false) {
  this.min_x = (this.canvas.width - this.num_cells*this.cell_size)/2;
  this.min_y = (this.canvas.height - this.num_cells*this.cell_size)/2;

  min_x = this.min_x;
  min_y = this.min_y;

  if (is_full_grid) {
    min_x = top_left[0];
    min_y = top_left[1];
  }

  for (i=0; i<=cells_to_draw; i++){
    this.ctx.beginPath();

    this.ctx.setLineDash([this.cell_size/6, this.cell_size/6]);
    this.ctx.strokeStyle = 'gray';
    this.ctx.lineWidth = this.cell_size/80;

    this.ctx.moveTo(min_x + i*this.cell_size, min_y);
    this.ctx.lineTo(min_x + i*this.cell_size, this.max_y);

    this.ctx.moveTo(min_x, min_y + i*this.cell_size);
    this.ctx.lineTo(this.max_x, min_y + i*this.cell_size);

    this.ctx.stroke();
    this.ctx.closePath();
  }
}

Grid.prototype.redrawEdges = function() {
  this.ctx.beginPath();

  this.ctx.setLineDash([]);
  this.ctx.strokeStyle = 'rgb(255,255,255)';
  this.ctx.lineWidth = this.cell_size/80;

  this.ctx.moveTo(this.in_x, this.min_y);
  this.ctx.lineTo(this.min_x, this.max_y);

  this.ctx.moveTo(this.min_x, this.min_y);
  this.ctx.lineTo(this.max_x, this.min_y);

  this.ctx.moveTo(this.min_x, this.max_y);
  this.ctx.lineTo(this.max_x, this.max_y);

  this.ctx.moveTo(this.max_x, this.min_y);
  this.ctx.lineTo(this.max_x, this.max_y);

  this.ctx.stroke();
  this.ctx.closePath();
}

// function to colour a cell, x and y is upper left corner of the cell
Grid.prototype.colourCell = function(x, y, colour, overall=true, undo=false) {
  // make sure the click is in the grid
  var changed = false;
  if (x <=this.min_x + (this.num_cells-1)*this.cell_size && x>= this.min_x && y <=this.min_y + (this.num_cells-1)*this.cell_size && y>= this.min_y){
    this.ctx.beginPath();
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(x, y, this.cell_size, this.cell_size);
    this.ctx.closePath();

    if (colour != this.coloured_cells[[x, y]]) changed = true;

    this.coloured_cells[[x, y]] = colour;

    if ((overall && changed) || undo) drawOverall(x, y, [top_left[0], top_left[1]]);
  }

  return changed;
}

Grid.prototype.colourGrid = function() {
  for (var coords_string in this.coloured_cells) {
    coords_string = coords_string.split(',');
    var coords = [parseInt(coords_string[0], 10), parseInt(coords_string[1], 10)];
    this.colourCell(coords[0], coords[1], this.coloured_cells[coords_string]);
  }
}

var h_scrolling = false, v_scrolling = false;

// use a closure to pass the grid and palette to the mouse event handlers
function addClickHandler(grid, palette) {
  document.addEventListener('click', function(e){
    // need the upper left corner of the cell
    var x = grid.min_x + grid.cell_size*Math.floor((e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - grid.div.offsetLeft - grid.min_x)/grid.cell_size);
    var y = grid.min_y + grid.cell_size*Math.floor((e.clientY + document.body.scrollTop + document.documentElement.scrollTop - grid.div.offsetTop - grid.min_y)/grid.cell_size);

    if (mode === "fill") {
      previous_grids.push(Object.assign({}, fullGrid.coloured_cells));
      var changed = fill(grid, x, y); // this will fill the rest of the area
      if (!changed) previous_grids.pop();
    }

    var paletteX = palette.cell_size*Math.floor((e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - palCanvasDiv.offsetLeft)/palette.cell_size);
    var paletteY = palette.cell_size*Math.floor((e.clientY + document.body.scrollTop + document.documentElement.scrollTop - palCanvasDiv.offsetTop)/palette.cell_size);
    palette.changeColour(paletteX, paletteY);

    var fullGridX = fullGrid.cell_size*Math.floor((e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - overallDiv.offsetLeft)/fullGrid.cell_size);
    var fullGridY = fullGrid.cell_size*Math.floor((e.clientY + document.body.scrollTop + document.documentElement.scrollTop - overallDiv.offsetTop)/fullGrid.cell_size);
    if (fullGridX >= fullGrid.min_x && fullGridX < fullGrid.max_x && fullGridY >= fullGrid.min_y && fullGridY < fullGrid.max_y) {
      moveWorking([fullGridX, fullGridY]);
      var top = ($(".vertical-scroll").height() - $(".vert-bar").height())*(top_left[1] - fullGrid.min_y)/(fullGrid.max_y - workingGrid.num_cells*fullGrid.cell_size - fullGrid.min_y);
      var left = ($(".horiz-scroll").width() - $(".horiz-bar").width())*(top_left[0] - fullGrid.min_x)/(fullGrid.max_x - workingGrid.num_cells*fullGrid.cell_size - fullGrid.min_x);

      $(".vert-bar").css('top', top + 'px');
      $(".horiz-bar").css('left', left + 'px');
    }
  }, false);

  var drag_started = false;
  var held_down = false;
  var initialX, initialY, rawInitialX, rawInitialY;
  var width, height; // for our drag box

  document.getElementById("vscroll").onmousedown = function() {
    v_scrolling = true;
  };

  document.getElementById("hscroll").onmousedown = function() {
    h_scrolling = true;
  };

  document.addEventListener('mousedown', function(e) {
    initialX = grid.min_x + grid.cell_size*Math.floor((e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - grid.div.offsetLeft - grid.min_x)/grid.cell_size);
    initialY = grid.min_y + grid.cell_size*Math.floor((e.clientY + document.body.scrollTop + document.documentElement.scrollTop - grid.div.offsetTop - grid.min_y)/grid.cell_size);

    if (!drag_started && mode === "box"){
      rawInitialX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      rawInitialY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

      // if our initial click was in the grid
      if (initialX <= grid.max_x && initialX >= grid.min_x && initialY <= grid.max_y && initialY >= grid.min_y){
        drag_started = true;
        previous_grids.push(Object.assign({}, fullGrid.coloured_cells)); // have to remove this if the box doesn't actually change anything
      }
    }
    else if (mode === "normal") {
      held_down = true;
      previous_grids.push(Object.assign({}, fullGrid.coloured_cells)); // have to push a copy, otherwise will pass by reference
      var changed = grid.colourCell(initialX, initialY, current_colour);
      if (!changed) previous_grids.pop();
    }
    }, false);

  document.addEventListener('mouseup', function(e) {
    if (v_scrolling || h_scrolling) {
      v_scrolling = false;
      h_scrolling = false;
    }
    if (drag_started){
      // clear canvas
      grid.ctx.clearRect(0, 0, canvas.width, canvas.height);

      // redraw grid
      for (var coords in grid.coloured_cells){
        var coords_parsed = coords.split(',')
        coords_parsed = [parseInt(coords_parsed[0], 10), parseInt(coords_parsed[1], 10)];
        grid.colourCell(coords_parsed[0], coords_parsed[1], grid.coloured_cells[coords]);
      }

      // we can leave these as being outside the grid as the call to colourCell will check that they falll withiin the grid
      var finalX = grid.min_x + grid.cell_size*Math.floor((e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - grid.div.offsetLeft - grid.min_x)/grid.cell_size);
      var finalY = grid.min_y + grid.cell_size*Math.floor((e.clientY + document.body.scrollTop + document.documentElement.scrollTop - grid.div.offsetTop - grid.min_y)/grid.cell_size);

      var any_changed = false;
      var current_changed;
      // now we need to colour all the cells we have touched
      for (x=Math.min(initialX, finalX); x<=Math.max(initialX, finalX); x+=grid.cell_size){
        for (y=Math.min(initialY, finalY); y<=Math.max(initialY, finalY); y+=grid.cell_size){
          current_changed = grid.colourCell(x, y, current_colour);
          any_changed = any_changed || current_changed; // so only one of these need to return true for changed to be true overall
        }
      }

      if (!any_changed) previous_grids.pop();

      drag_started = false;
      grid.draw();
    }
    else if (held_down) {
      held_down = false;
      grid.ctx.clearRect(0, 0, grid.canvas.width, grid.canvas.height);
      grid.colourGrid();
      grid.draw();
    }

  }, false);

  document.addEventListener('mousemove', function(e) {
    // now plot our drag box
    if (drag_started) {
      // clear canvas
      grid.ctx.clearRect(0, 0, canvas.width, canvas.height);

      // redraw grid
      for (var coords in grid.coloured_cells){
        var coords_parsed = coords.split(',')
        coords_parsed = [parseInt(coords_parsed[0], 10), parseInt(coords_parsed[1], 10)];
        grid.colourCell(coords_parsed[0], coords_parsed[1], grid.coloured_cells[coords]);
      }

      var currentX = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      var currentY = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

      if (currentX < grid.min_x + grid.div.offsetLeft) currentX = grid.min_x + grid.div.offsetLeft;
      else if (currentX > grid.max_x + grid.div.offsetLeft) currentX = grid.min_x + grid.div.offsetLeft + grid.cell_size*grid.num_cells;
      if (currentY < grid.min_y + grid.div.offsetTop) currentY = grid.min_y + grid.div.offsetTop;
      else if (currentY > grid.max_y + grid.div.offsetTop) currentY = grid.min_y + grid.div.offsetTop + grid.cell_size*grid.num_cells;

      // update box parameters
      width = currentX - rawInitialX;
      height = currentY - rawInitialY;

      grid.ctx.save();
      grid.ctx.beginPath();
      grid.ctx.setLineDash([]);
      grid.ctx.strokeStyle = current_colour;
      grid.ctx.rect(rawInitialX - grid.div.offsetLeft, rawInitialY - grid.div.offsetTop, width, height);
      grid.ctx.closePath();
      grid.ctx.stroke();
      grid.ctx.restore();

      grid.draw();
    }
    else if(held_down && !v_scrolling && !h_scrolling){
      var x = grid.min_x + grid.cell_size*Math.floor((e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - grid.div.offsetLeft - grid.min_x)/grid.cell_size);
      var y = grid.min_y + grid.cell_size*Math.floor((e.clientY + document.body.scrollTop + document.documentElement.scrollTop - grid.div.offsetTop - grid.min_y)/grid.cell_size);

      grid.colourCell(x, y, current_colour);
    }
  }, false);

}

function contains(arr, elem) {
  // this is to tell if an array of arrays contains an array
  for (i=0; i<arr.length; i++){
    var match = true;
    for (j=0; j<arr[i].length; j++){
      if (arr[i][j] != elem[j]) match = false;
    }

    if (match) return true;
  }

  return false;
}

function neighbours(grid, x, y) {
  // return the adjacent cells to x, y
  var nbours = [];
  if (x > grid.min_x) nbours.push([x-grid.cell_size, y]);
  if (x < grid.max_x-grid.cell_size) nbours.push([x+grid.cell_size, y]);
  if (y > grid.min_y) nbours.push([x, y-grid.cell_size]);
  if (y < grid.max_y-grid.cell_size) nbours.push([x, y+grid.cell_size]);

  return nbours;
}

function fill(grid, x, y) {
  var changed = false;
  if (x <=grid.min_x + (grid.num_cells-1)*grid.cell_size && x>= grid.min_x && y <=grid.num_cells*grid.cell_size && y>= grid.min_y){
    var colour = grid.coloured_cells[[x, y]];

    if (colour != current_colour) changed = true;

    if (changed){
      var to_colour = [[x, y]], visited = [[x, y]]; // will add [x, y] coords to these

      // basically need to perform dijkstra's
      var unvisited = neighbours(grid, x, y);

      var count = 0;
      while (unvisited.length > 0){
        // now visit
        var to_visit = unvisited.pop();

        if (grid.coloured_cells[to_visit] === colour) {
          to_colour.push(to_visit);

          var nbours = neighbours(grid, to_visit[0], to_visit[1]);

          for (var index in nbours){
            if (!contains(visited, nbours[index]) && !contains(unvisited, nbours[index])) unvisited.push(nbours[index]); // add to unvisited if we haven't visited it before and not in unvisited
          }
        }

        visited.push(to_visit); // has been visited
        count++;
      }

      // now colour all the elements
      for (var index in to_colour){
        grid.colourCell(to_colour[index][0], to_colour[index][1], current_colour);
      }

      grid.draw();
      grid.redrawEdges();
    }
  }

  return changed;
}

function toggleMode(input) {
  mode = input;
  console.log('Mode: ' + mode);
}

toggleMode("normal"); // others are 'fill' and 'box'

// palette code

var palCanvasDiv = document.getElementById("d2");
var paletteCanvas = document.getElementById("paletteCanvas");
var paletteCtx = paletteCanvas.getContext("2d");

var Palette = function(num_colours) {
  // need 3 indices running over R, G, B - 0 to 255
  this.spacing = 255/(Math.pow(num_colours, 1/3)-1);

  this.cell_size = Math.sqrt(paletteCanvas.width*paletteCanvas.height/num_colours);
  var num_cols = Math.floor(paletteCanvas.width/this.cell_size)+1;
  var num_rows = Math.floor(paletteCanvas.height/this.cell_size)+1;
  //paletteCanvas.width = num_cols*this.cell_size;
  //paletteCanvas.height = num_rows*this.cell_size;
  this.colours = []; // we will fill this when we draw the palette
}

Palette.prototype.draw = function() {
  var x=0;
  var y=0;
  for(g=0.0; g<=255; g+=this.spacing){
    for(r=0.0; r<=255; r+=this.spacing){
      for(b=0.0; b<=255; b+=this.spacing){
        if (x + this.cell_size > paletteCanvas.width) {
          y += this.cell_size;
          x = 0;
        }
        var colour = "rgb(" + Math.floor(r) + "," + Math.floor(g) + "," + Math.floor(b) +")";
        paletteCtx.beginPath();
        paletteCtx.fillStyle = colour;
        paletteCtx.fillRect(x, y, this.cell_size, this.cell_size);
        paletteCtx.closePath();

        this.colours[[Math.round(x), Math.round(y)]] = colour; // be careful with this rounding - what if we have multiple entries between consecutive integers?
        x += this.cell_size;
      }
    }
  }
}

Palette.prototype.changeColour = function(x, y) {
  //if (paletteCanvas.style.visibility === "visible"){
    if (y >= 0 && y < paletteCanvas.height && x >= 0 && x < paletteCanvas.width){
      current_colour = this.colours[[Math.round(x), Math.round(y)]];
    }
  //}
}

var overallDiv = document.getElementById("d3");
var overallCanvas = document.getElementById("overallCanvas");
// var overallCtx = overallCanvas.getContext("2d");

// main code

var fullGrid = new Grid(4, 80, overallCanvas, overallDiv);
var workingGrid = new Grid(28, 20, canvas, canvasDiv);
var current_colour = 'rgb(0, 0, 0)';

var top_left = [];

moveWorking([fullGrid.min_x, fullGrid.min_y]);

//workingGrid.draw();

// fullGrid.draw();

var previous_grids = []; // the dimenstions will not change, we just need to add the coloured_cells to the stack

var myPalette = new Palette(125);

myPalette.draw();

addClickHandler(workingGrid, myPalette);

function drawContextBox(){
  // now plot the box on the full grid
  fullGrid.ctx.clearRect(0, 0, fullGrid.canvas.width, fullGrid.canvas.height);
  fullGrid.draw();
  fullGrid.colourGrid();

  fullGrid.ctx.save();
  fullGrid.ctx.beginPath();
  fullGrid.ctx.setLineDash([]);
  fullGrid.ctx.lineWidth = fullGrid.cell_size/10;
  fullGrid.ctx.strokeStyle = 'rgb(0,0,0)';
  fullGrid.ctx.rect(top_left[0], top_left[1], workingGrid.num_cells*fullGrid.cell_size, workingGrid.num_cells*fullGrid.cell_size);
  fullGrid.ctx.closePath();
  fullGrid.ctx.stroke();
  fullGrid.ctx.restore();
}

function moveWorking(move_to) {
  // move our working grid to a different part of the full grid
  // need to make sure we won't go off the edge of the grid
  top_left = [fullGrid.min_x + fullGrid.cell_size*Math.floor((move_to[0] - fullGrid.min_x)/fullGrid.cell_size), fullGrid.min_y + fullGrid.cell_size*Math.floor((move_to[1] - fullGrid.min_y)/fullGrid.cell_size)];
  if (top_left[0] + workingGrid.num_cells*fullGrid.cell_size > fullGrid.max_x) top_left[0] = fullGrid.max_x - workingGrid.num_cells*fullGrid.cell_size;
  if (top_left[1] + workingGrid.num_cells*fullGrid.cell_size > fullGrid.max_y) top_left[1] = fullGrid.max_y - workingGrid.num_cells*fullGrid.cell_size;

  // first move our working grid and redraw according to info from the full grid
  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);

  // now update our coloured cells array
  workingGrid.coloured_cells = [];

  // can either iterate through fullGrid.coloured_cells or through all the cells in workingGrid
  for (x=0; x<=workingGrid.num_cells; x++){
    for (y=0; y<=workingGrid.num_cells; y++){
      var fullX = top_left[0] + x*fullGrid.cell_size;
      var fullY = top_left[1] + y*fullGrid.cell_size;
      var workingX = workingGrid.min_x + x*workingGrid.cell_size;
      var workingY = workingGrid.min_y + y*workingGrid.cell_size;

      if ([fullX, fullY] in fullGrid.coloured_cells) workingGrid.colourCell(workingX, workingY, fullGrid.coloured_cells[[fullX, fullY]], false);
    }
  }

  workingGrid.draw();

  drawContextBox();
}

function drawOverall(working_x, working_y, top_left) {
  // top_left is the location of the working grid in to the full grid
  // transfer the coloured_cells vector to the full grid
  var coords = [working_x, working_y];
  var colour = workingGrid.coloured_cells[coords];

  // scale the coords for the full grid
  coords[0] -= workingGrid.min_x;
  coords[0] *= fullGrid.cell_size/workingGrid.cell_size;
  coords[0] += top_left[0];

  coords[1] -= workingGrid.min_y;
  coords[1] *= fullGrid.cell_size/workingGrid.cell_size;
  coords[1] += top_left[1];

  fullGrid.colourCell(coords[0], coords[1], colour, false);
  fullGrid.coloured_cells[coords] = colour;
}
// localStorage.setItem('save_number', 1);

function savePicture() {
  // first need to convert keys to strings in the coloured_cells array
  var save_array = {};
  for (var coords in fullGrid.coloured_cells){
    save_array[coords.toString()] = fullGrid.coloured_cells[coords];
  }

  //var number = localStorage.getItem('save_number');
  localStorage.removeItem('picture');
  localStorage['picture'] = JSON.stringify(save_array);
  //console.log('picture' + number + ' has been saved');
  //localStorage.removeItem('save_number');
  //number++;
  //localStorage.setItem('save_number', number);
}

function loadPicture() {
  fullGrid.ctx.clearRect(0, 0, fullGrid.canvas.width, fullGrid.canvas.height);
  fullGrid.coloured_cells = []; // reset

  var coloured_cells = JSON.parse(localStorage['picture']);

  for (var coords_string in coloured_cells){
    var coords = coords_string.split(',')
    coords = [parseInt(coords[0], 10), parseInt(coords[1], 10)];

    fullGrid.ctx.beginPath();
    fullGrid.ctx.fillStyle = coloured_cells[coords_string];
    fullGrid.ctx.fillRect(coords[0], coords[1], fullGrid.cell_size, fullGrid.cell_size);
    fullGrid.ctx.closePath();

    // now need to add point to myGrid's array
    fullGrid.coloured_cells[coords] = coloured_cells[coords_string];
  }

  fullGrid.draw();

  moveWorking([fullGrid.min_x, fullGrid.min_y]);
}

function clearPicture() {
  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);

  workingGrid.coloured_cells = [];
  workingGrid.draw();

  fullGrid.ctx.clearRect(top_left[0]-fullGrid.cell_size, top_left[1]-fullGrid.cell_size, 1+(workingGrid.num_cells+1)*fullGrid.cell_size, 1+(workingGrid.num_cells+1)*fullGrid.cell_size);
  fullGrid.draw(workingGrid.num_cells, true);

  // now update fullGrid's coloured_cells array
  for (x=0; x<workingGrid.num_cells; x++){
    for (y=0; y<workingGrid.num_cells; y++){
      delete fullGrid.coloured_cells[[top_left[0] + x*fullGrid.cell_size, top_left[1] + y*fullGrid.cell_size]];
    }
  }

  drawContextBox();
}

function undo(){
  // pop the last iteration of myGrid off the stack and draw it
  if (previous_grids.length > 0){
    fullGrid.coloured_cells = previous_grids.pop();

    fullGrid.ctx.clearRect(0, 0, fullGrid.canvas.width, fullGrid.canvas.height);

    for (var coords_string in fullGrid.coloured_cells){
      var coords = coords_string.split(',')
      coords = [parseInt(coords[0], 10), parseInt(coords[1], 10)];

      fullGrid.ctx.beginPath();
      fullGrid.ctx.fillStyle = fullGrid.coloured_cells[coords_string];
      fullGrid.ctx.fillRect(coords[0], coords[1], fullGrid.cell_size, fullGrid.cell_size);
      fullGrid.ctx.closePath();

      // now need to add point to myGrid's array
      fullGrid.coloured_cells[coords] = fullGrid.coloured_cells[coords_string];
    }

    fullGrid.draw();

    moveWorking(top_left);

    for (var coords in workingGrid.coloured_cells){
      coords = coords.split(',');
      coords = [parseInt(coords[0], 10), parseInt(coords[1], 10)];

      workingGrid.colourCell(coords[0], coords[1], workingGrid.coloured_cells[coords], true, true);
    }
  }
}

var vscrollbarParent = document.getElementById("vscroll");
var vscrollbar = document.getElementById("vbar");
vscrollbar.style.height = $(".vertical-scroll").height()*workingGrid.num_cells/fullGrid.num_cells + 'px';


$(".vert-bar").draggable({
            containment: "parent",
            axis: "y"
        });

$(".vert-bar").on("drag", function (event, ui) {
    var top_left_y = fullGrid.min_y + (ui.position.top/($(".vertical-scroll").height()-$(".vert-bar").height()))*fullGrid.num_cells*fullGrid.cell_size*(1 - workingGrid.num_cells/fullGrid.num_cells);
    moveWorking([top_left[0], top_left_y]);
});


var hscrollbarParent = document.getElementById("hscroll");
var hscrollbar = document.getElementById("hbar");
hscrollbar.style.width = $(".horiz-scroll").width()*workingGrid.num_cells/fullGrid.num_cells + 'px';


$(".horiz-bar").draggable({
            containment: "parent",
            axis: "x"
        });

$(".horiz-bar").on("drag", function (event, ui) {
    var top_left_x = fullGrid.min_x + (ui.position.left/($(".horiz-scroll").width()-$(".horiz-bar").width()))*fullGrid.num_cells*fullGrid.cell_size*(1 - workingGrid.num_cells/fullGrid.num_cells);
    moveWorking([top_left_x, top_left[1]]);
});

function zoomIn() {
  // move by fixed amount of pixels for now - full Grid is 80 cells wide, cell width of 4
  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);

  console.log(workingGrid.cell_size);

  if (workingGrid.num_cells >= 2) {
    workingGrid.cell_size = Math.floor(2*workingGrid.cell_size);
    workingGrid.num_cells = Math.floor(workingGrid.num_cells/2);
  } else {
    workingGrid.cell_size = fullGrid.cell_size;
    workingGrid.num_cells = fullGrid.num_cells;
  }

  console.log(workingGrid.cell_size);

  // now update our coloured cells array
  workingGrid.coloured_cells = [];

  // can either iterate through fullGrid.coloured_cells or through all the cells in workingGrid
  for (x=0; x<=workingGrid.num_cells; x++){
    for (y=0; y<=workingGrid.num_cells; y++){
      var fullX = top_left[0] + x*fullGrid.cell_size;
      var fullY = top_left[1] + y*fullGrid.cell_size;
      var workingX = workingGrid.min_x + x*workingGrid.cell_size;
      var workingY = workingGrid.min_y + y*workingGrid.cell_size;

      if ([fullX, fullY] in fullGrid.coloured_cells) workingGrid.colourCell(workingX, workingY, fullGrid.coloured_cells[[fullX, fullY]], false);
    }
  }

  workingGrid.draw();

  drawContextBox();

  vscrollbar.style.height = $(".vertical-scroll").height()*workingGrid.num_cells/fullGrid.num_cells + 'px';
  hscrollbar.style.width = $(".horiz-scroll").width()*workingGrid.num_cells/fullGrid.num_cells + 'px';
}

function zoomOut() {
  // move by fixed amount of pixels for now - full Grid is 80 cells wide, cell width of 4
  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);

  if (workingGrid.cell_size >= fullGrid.cell_size*2) {
    workingGrid.cell_size /= 2;
    workingGrid.num_cells *= 2;
  } else {
    workingGrid.num_cells = fullGrid.num_cells;
    workingGrid.cell_size = (workingGrid.max_x - workingGrid.min_x)/workingGrid.num_cells;
  }

  // now update our coloured cells array
  workingGrid.coloured_cells = [];

  // amend the top left of the context box if needed
  if (top_left[0] + workingGrid.num_cells*fullGrid.cell_size > fullGrid.max_x) top_left[0] = fullGrid.max_x - workingGrid.num_cells*fullGrid.cell_size;
  if (top_left[1] + workingGrid.num_cells*fullGrid.cell_size > fullGrid.max_y) top_left[1] = fullGrid.max_y - workingGrid.num_cells*fullGrid.cell_size;

  // can either iterate through fullGrid.coloured_cells or through all the cells in workingGrid
  for (x=0; x<=workingGrid.num_cells; x++){
    for (y=0; y<=workingGrid.num_cells; y++){
      var fullX = top_left[0] + x*fullGrid.cell_size;
      var fullY = top_left[1] + y*fullGrid.cell_size;
      var workingX = workingGrid.min_x + x*workingGrid.cell_size;
      var workingY = workingGrid.min_y + y*workingGrid.cell_size;

      if ([fullX, fullY] in fullGrid.coloured_cells) workingGrid.colourCell(workingX, workingY, fullGrid.coloured_cells[[fullX, fullY]], false);
    }
  }

  workingGrid.draw();

  drawContextBox();

  vscrollbar.style.height = $(".vertical-scroll").height()*workingGrid.num_cells/fullGrid.num_cells + 'px';
  hscrollbar.style.width = $(".horiz-scroll").width()*workingGrid.num_cells/fullGrid.num_cells + 'px';

  if ($(".vert-bar").position().top + $(".vert-bar").height() > $(".vertical-scroll").height()) $(".vert-bar").css('top', $(".vertical-scroll").height() - $(".vert-bar").height() + 'px');
  if ($(".horiz-bar").position().left + $(".horiz-bar").width() > $(".horiz-scroll").width()) $(".horiz-bar").css('left', $(".horiz-scroll").width() - $(".horiz-bar").width() + 'px');
}
