// create a class for our grid
var Grid = function(cell_size, num_cells, cnv, div){
  this.canvas = cnv;
  this.ctx = this.canvas.getContext("2d");
  this.div = div;

  this.cell_size = cell_size;
  this.num_cells = num_cells;
  this.area = this.cell_size * this.num_cells;
  this.coloured_cells = [];

  this.min_x = (this.canvas.width - this.num_cells*this.cell_size)/2;
  this.min_y = (this.canvas.height - this.num_cells*this.cell_size)/2;
  this.max_x = this.min_x + this.num_cells*this.cell_size;
  this.max_y = this.min_y + this.num_cells*this.cell_size;
}

Grid.prototype.inGrid = function(x, y) {
  return x < this.num_cells && x >= 0 && y < this.num_cells && y >= 0;
}

Grid.prototype.reset = function() {
  this.min_x = (this.canvas.width - this.num_cells*this.cell_size)/2;
  this.min_y = (this.canvas.height - this.num_cells*this.cell_size)/2;
  this.max_x = this.min_x + this.num_cells*this.cell_size;
  this.max_y = this.min_y + this.num_cells*this.cell_size;
}

// draw the gridlines
Grid.prototype.drawGridlines = function(cells_to_draw=this.num_cells, minX=this.min_x, minY = this.min_y) {
  maxX = Math.min(this.max_x, minX + cells_to_draw*this.cell_size);
  maxY = Math.min(this.max_y, minY + cells_to_draw*this.cell_size);
  for (i=0; i<=cells_to_draw; i++){
    this.ctx.beginPath();
    this.ctx.setLineDash([this.cell_size/6, this.cell_size/6]);
    this.ctx.strokeStyle = 'gray';
    this.ctx.lineWidth = this.cell_size/80;

    this.ctx.moveTo(minX + i*this.cell_size, minY);
    this.ctx.lineTo(minX + i*this.cell_size, maxY);

    this.ctx.moveTo(minX, minY + i*this.cell_size);
    this.ctx.lineTo(maxX, minY + i*this.cell_size);

    this.ctx.stroke();
    this.ctx.closePath();
  }
}

Grid.prototype.drawDragBox = function(rawX, rawY, width, height) {
  this.ctx.save();
  this.ctx.beginPath();
  this.ctx.setLineDash([]);
  this.ctx.strokeStyle = current_colour;
  this.ctx.rect(rawX - this.div.offsetLeft, rawY - this.div.offsetTop, width, height);
  this.ctx.closePath();
  this.ctx.stroke();
  this.ctx.restore();
}

Grid.prototype.indexToPositionX = function(xIndex) {
  return this.min_x + xIndex*this.cell_size;
}

Grid.prototype.indexToPositionY = function(yIndex) {
  return this.min_y + yIndex*this.cell_size;
}

Grid.prototype.colourCell = function(leftX, topY, colour, overall=true) {
  // make sure the click is in the grid
  var changed = false;

  if (this.inGrid(leftX, topY)){
    this.ctx.beginPath();
    this.ctx.fillStyle = colour;
    this.ctx.fillRect(this.indexToPositionX(leftX), this.indexToPositionY(topY), this.cell_size, this.cell_size);
    this.ctx.closePath();

    if (colour != this.coloured_cells[[leftX, topY]]) changed = true;
    this.coloured_cells[[leftX, topY]] = colour;
    if (overall && changed) drawOverall(leftX, topY);
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

Grid.prototype.redraw = function() {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  this.colourGrid();
  this.drawGridlines();
}

Grid.prototype.getLeftX = function(e) {
  return Math.floor((e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - this.div.offsetLeft - this.min_x)/this.cell_size);
}

Grid.prototype.getTopY = function(e) {
  return Math.floor((e.clientY + document.body.scrollTop + document.documentElement.scrollTop - this.div.offsetTop - this.min_y)/this.cell_size);
}

Grid.prototype.pen = function(x, y) {
  var changed = false;
  if (nib_size === "small") changed = this.colourCell(x, y, current_colour);
  else if (nib_size === "medium") {
      // colour all cells adjacent to the clicked cell
      for (i=-1; i<=1; i++){
        for (j=-1; j<=1; j++){
          var current_changed = this.colourCell(x+i, y+j, current_colour);
          if (current_changed) changed = true;
        }
      }
  }
  else {
    // colour all cells two cells adjacent to the clicked cell
    for (i=-2; i<=2; i++){
      for (j=-2; j<=2; j++){
        var current_changed = this.colourCell(x+i, y+j, current_colour);
        if (current_changed) changed = true;
      }
    }
  }
  this.redraw();

  return changed;
}

Grid.prototype.eraser = function(x, y) {
  var changed = false;
  var num_adjacent_to_erase = 0;
  if (nib_size === "medium") num_adjacent_to_erase = 1;
  else if (nib_size === "large") num_adjacent_to_erase = 2;

  for (a=-num_adjacent_to_erase; a<=num_adjacent_to_erase; a++){
    for (b=-num_adjacent_to_erase; b<=num_adjacent_to_erase; b++){
      if (this.inGrid(x+a, y+b) && [x+a, y+b] in this.coloured_cells) {
        delete this.coloured_cells[[x+a, y+b]];
        changed = true;

        fullGrid.eraseCell(x+a + top_left[0], y+b + top_left[1]);
      }
    }
  }
  this.redraw();

  return changed;
}

Grid.prototype.eraseCell = function(x, y) {
  if (this.inGrid(x, y)) {
    delete this.coloured_cells[[x, y]];

    this.ctx.beginPath();
    this.ctx.fillStyle = 'rgb(255, 255, 255)';
    this.ctx.fillRect(this.indexToPositionX(x), this.indexToPositionY(y), this.cell_size, this.cell_size);
    this.ctx.closePath();
  }
}


// this is to tell if an array of arrays contains an array
function contains(arr, elem) {
  for (i=0; i<arr.length; i++){
    var match = true;
    for (j=0; j<arr[i].length; j++){
      if (arr[i][j] != elem[j]) match = false;
    }
    if (match) return true;
  }
  return false;
}

// returns an array containing the adjacent cells to cell (x, y)
Grid.prototype.neighbours = function(x, y) {
  var nbours = [];
  if (x > 0) nbours.push([x-1, y]);
  if (x < this.num_cells) nbours.push([x+1, y]);
  if (y > 0) nbours.push([x, y-1]);
  if (y < this.num_cells) nbours.push([x, y+1]);

  return nbours;
}

Grid.prototype.fill = function(x, y) {
  var changed = false;
  if (this.inGrid(x, y)){
    var colour = this.coloured_cells[[x, y]];

    if (colour != current_colour) changed = true;

    if (changed){
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.colourGrid();
      var to_colour = [[x, y]], visited = [[x, y]]; // will add [x, y] coords to these

      // basically need to perform dijkstra's
      var unvisited = this.neighbours(x, y);
      while (unvisited.length > 0){
        var to_visit = unvisited.pop();
        if (this.coloured_cells[to_visit] === colour) {
          to_colour.push(to_visit);
          var nbours = this.neighbours(to_visit[0], to_visit[1]);
          for (var index in nbours){
            // add cell to unvisited if we haven't visited it before and not in unvisited already
            if (!contains(visited, nbours[index]) && !contains(unvisited, nbours[index])) unvisited.push(nbours[index]);
          }
        }
        visited.push(to_visit); // has been visited
      }
      // now colour all the elements
      for (var index in to_colour){
        this.colourCell(to_colour[index][0], to_colour[index][1], current_colour);
      }
      this.drawGridlines();
    }
  }
  return changed;
}

function getRawX(e) {
  return e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
}

function getRawY(e) {
  return e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
}


// use a closure to pass the grid to the mouse event handlers
function addFullGridClickHandler(grid) {
  grid.canvas.addEventListener('click', function(e) {
    var x = grid.getLeftX(e);
    var y = grid.getTopY(e);
    if (grid.inGrid(x, y)) {
      moveWorking([x, y]);
      moveScrollBars();
    }

  }, false);
}

function addWorkingGridClickHandler(grid) {
  grid.canvas.addEventListener('click', function(e) {
    if (mode === "fill") {
      previous_grids.push(Object.assign({}, fullGrid.coloured_cells));
      var changed = grid.fill(grid.getLeftX(e), grid.getTopY(e));
      if (!changed) previous_grids.pop();
    }

    current_colour = $("#colourPicker").spectrum('get').toHexString();
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

  grid.canvas.addEventListener('mousedown', function(e) {
    initialX = grid.getLeftX(e);
    initialY = grid.getTopY(e);

    if (!drag_started && mode === "box"){
      rawInitialX = getRawX(e);
      rawInitialY = getRawY(e);

      // if our initial click was in the grid
      if (grid.inGrid(initialX, initialY)){
        drag_started = true;
        previous_grids.push(Object.assign({}, fullGrid.coloured_cells)); // have to remove this if the box doesn't actually change anything
      }
    }
    else if (mode === "pen") {
      held_down = true;
      previous_grids.push(Object.assign({}, fullGrid.coloured_cells)); // have to push a copy, otherwise will pass by reference
      var changed = grid.pen(initialX, initialY);
      if (!changed) previous_grids.pop();
    }
    else if (mode === "eraser") {
      held_down = true;
      previous_grids.push(Object.assign({}, fullGrid.coloured_cells)); // have to push a copy, otherwise will pass by reference
      var changed = grid.eraser(initialX, initialY);
      if (!changed) previous_grids.pop();
    }
    }, false);

  grid.canvas.addEventListener('mouseup', function(e) {
    if (v_scrolling || h_scrolling) {
      v_scrolling = false;
      h_scrolling = false;
    }
    if (drag_started){
      grid.ctx.clearRect(0, 0, canvas.width, canvas.height);
      grid.colourGrid();

      // we can leave these as being outside the grid as the call to colourCell will check that they fall withiin the grid
      var finalX = grid.getLeftX(e);
      var finalY = grid.getTopY(e);

      var any_changed = false;
      var current_changed;
      // now we need to colour all the cells we have touched
      for (x=Math.min(initialX, finalX); x<=Math.max(initialX, finalX); x++){
        for (y=Math.min(initialY, finalY); y<=Math.max(initialY, finalY); y++){
          current_changed = grid.colourCell(x, y, current_colour);
          any_changed = any_changed || current_changed; // so only one of these need to return true for changed to be true overall
        }
      }

      if (!any_changed) previous_grids.pop(); // if nothing changed then don't need to save this grid

      drag_started = false;
      grid.drawGridlines();
    }

    held_down = false;

  }, false);

  grid.canvas.addEventListener('mousemove', function(e) {
    // now plot our drag box
    if (drag_started) {
      // clear canvas
      grid.ctx.clearRect(0, 0, canvas.width, canvas.height);

      // redraw grid
      grid.colourGrid();

      var currentX = getRawX(e);
      var currentY = getRawY(e);

      // limit currentX and currentY
      if (currentX < grid.min_x + grid.div.offsetLeft) currentX = grid.min_x + grid.div.offsetLeft;
      else if (currentX > grid.max_x + grid.div.offsetLeft) currentX = grid.min_x + grid.div.offsetLeft + grid.cell_size*grid.num_cells;
      if (currentY < grid.min_y + grid.div.offsetTop) currentY = grid.min_y + grid.div.offsetTop;
      else if (currentY > grid.max_y + grid.div.offsetTop) currentY = grid.min_y + grid.div.offsetTop + grid.cell_size*grid.num_cells;

      // update box parameters
      width = currentX - rawInitialX;
      height = currentY - rawInitialY;

      grid.drawDragBox(rawInitialX, rawInitialY, width, height);
      grid.drawGridlines();
    }
    else if(held_down && !v_scrolling && !h_scrolling){
      var x = grid.getLeftX(e);
      var y = grid.getTopY(e);
      if (mode === "pen") {
        grid.pen(x, y);
      }
      else if (mode === "eraser") grid.eraser(x, y);
    }
  }, false);
}


function toggleMode(input) {
  mode = input;
  console.log('Mode: ' + mode);
  $('.modebutton').css('background-color', '#DCDCDC');
  $('.' + input + '-button').find('.modebutton').css('background-color', '#87CEFA');
}

function toggleNib(input) {
  nib_size = input;
  console.log('Nib size: ' + input);
  $('.nibbutton').css('background-color', '#DCDCDC');
  $('.' + input + 'nib-button').find('.nibbutton').css('background-color', '#87CEFA');
}


function drawContextBox(){
  // now plot the box on the full grid
  fullGrid.ctx.clearRect(0, 0, fullGrid.canvas.width, fullGrid.canvas.height);
  fullGrid.colourGrid();

  fullGrid.ctx.save();
  fullGrid.ctx.beginPath();
  fullGrid.ctx.setLineDash([]);
  fullGrid.ctx.lineWidth = fullGrid.cell_size/4;
  fullGrid.ctx.strokeStyle = 'rgb(0,0,0)';
  fullGrid.ctx.rect(fullGrid.indexToPositionX(top_left[0]), fullGrid.indexToPositionY(top_left[1]), workingGrid.num_cells*fullGrid.cell_size, workingGrid.num_cells*fullGrid.cell_size);
  fullGrid.ctx.closePath();
  fullGrid.ctx.stroke();
  fullGrid.ctx.restore();
}

// move our working grid to a different part of the full grid
function moveWorking(move_to) {
  move_to = [Math.floor(move_to[0]), Math.floor(move_to[1])];
  var max = fullGrid.num_cells - workingGrid.num_cells;
  top_left = [Math.min(Math.max(move_to[0], 0), max), Math.min(Math.max(move_to[1], 0), max)];

  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);
  workingGrid.coloured_cells = [];
  colourWorkingGrid();
  workingGrid.drawGridlines();
  drawContextBox();
}

function drawOverall(working_x, working_y) {
  // transfer the coloured_cells vector to the full grid
  var coords = [working_x, working_y];
  var colour = workingGrid.coloured_cells[coords];

  // scale the coords for the full grid
  coords[0] += top_left[0];
  coords[1] += top_left[1];

  fullGrid.colourCell(coords[0], coords[1], colour, false);
}

function savePicture() {
  // first need to convert keys to strings in the coloured_cells array
  var save_array = {};
  for (var coords in fullGrid.coloured_cells){
    save_array[coords.toString()] = fullGrid.coloured_cells[coords];
  }

  localStorage.removeItem('picture');
  localStorage['picture'] = JSON.stringify(save_array);
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

  fullGrid.drawGridlines();

  moveWorking([fullGrid.min_x, fullGrid.min_y]);
}

function clearPicture() {
  var response = confirm("Are you sure you want to delete the picture?");
  if (response) {
    workingGrid.coloured_cells = [];
    workingGrid.redraw();

    fullGrid.coloured_cells = [];
    fullGrid.redraw();
    drawContextBox();
  }
}

function undo(){
  // pop the last saved version of grid off the stack and draw it
  if (previous_grids.length > 0){
    fullGrid.coloured_cells = previous_grids.pop();

    fullGrid.ctx.clearRect(0, 0, fullGrid.canvas.width, fullGrid.canvas.height);
    fullGrid.colourGrid();

    moveWorking(top_left);
    workingGrid.redraw();
  }
}


function zoomIn() {
  if (workingGrid.num_cells >= 2) {
    workingGrid.num_cells = Math.floor(workingGrid.num_cells/zoomRatio);
    workingGrid.cell_size = workingGrid.area/workingGrid.num_cells;
  }

  workingGrid.reset();
  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);
  workingGrid.coloured_cells = [];
  colourWorkingGrid();
  workingGrid.drawGridlines();
  drawContextBox();
  updateScrollBarDimensions();
}

function zoomOut() {
  if (workingGrid.num_cells*zoomRatio <= fullGrid.num_cells) {
    workingGrid.num_cells = Math.ceil(zoomRatio*workingGrid.num_cells);
    workingGrid.cell_size = workingGrid.area/workingGrid.num_cells;
  } else {
    workingGrid.num_cells = fullGrid.num_cells;
    workingGrid.cell_size = workingGrid.area/workingGrid.num_cells;
  }

  // amend the top left of the context box if needed
  var max = fullGrid.num_cells - workingGrid.num_cells;
  top_left = [Math.min(Math.max(top_left[0], 0), max), Math.min(Math.max(top_left[1], 0), max)];

  workingGrid.reset()
  workingGrid.ctx.clearRect(0, 0, workingGrid.canvas.width, workingGrid.canvas.height);
  workingGrid.coloured_cells = [];
  colourWorkingGrid();
  workingGrid.drawGridlines();
  drawContextBox();
  updateScrollBarDimensions();
}


function colourWorkingGrid() {
  // can either iterate through fullGrid.coloured_cells or through all the cells in workingGrid
  for (x=0; x<=workingGrid.num_cells; x++){
    for (y=0; y<=workingGrid.num_cells; y++){
      var fullX = top_left[0] + x;
      var fullY = top_left[1] + y;

      if ([fullX, fullY] in fullGrid.coloured_cells) workingGrid.colourCell(x, y, fullGrid.coloured_cells[[fullX, fullY]], false);
    }
  }
}


function drawScrollBars() {
  var vscrollbar = document.getElementById("vbar");
  vscrollbar.style.height = $(".vertical-scroll").height()*workingGrid.num_cells/fullGrid.num_cells + 'px';


  $(".vert-bar").draggable({
              containment: "parent",
              axis: "y"
          });

  $(".vert-bar").on("drag", function (event, ui) {
      var top_left_y = (ui.position.top/($(".vertical-scroll").height()-$(".vert-bar").height()))*fullGrid.num_cells*(1 - workingGrid.num_cells/fullGrid.num_cells);
      moveWorking([top_left[0], top_left_y]);
  });


  var hscrollbar = document.getElementById("hbar");
  hscrollbar.style.width = $(".horiz-scroll").width()*workingGrid.num_cells/fullGrid.num_cells + 'px';

  $(".horiz-bar").draggable({
              containment: "parent",
              axis: "x"
          });

  $(".horiz-bar").on("drag", function (event, ui) {
      var top_left_x = (ui.position.left/($(".horiz-scroll").width()-$(".horiz-bar").width()))*fullGrid.num_cells*(1 - workingGrid.num_cells/fullGrid.num_cells);
      moveWorking([top_left_x, top_left[1]]);
  });
}

function moveScrollBars() {
  var top = ($(".vertical-scroll").height() - $(".vert-bar").height())*top_left[1]/(fullGrid.num_cells - workingGrid.num_cells);
  var left = ($(".horiz-scroll").width() - $(".horiz-bar").width())*top_left[0]/(fullGrid.num_cells - workingGrid.num_cells);

  $(".vert-bar").css('top', top + 'px');
  $(".horiz-bar").css('left', left + 'px');
}

function updateScrollBarDimensions() {
  var vscrollbar = document.getElementById("vbar");
  var hscrollbar = document.getElementById("hbar");
  vscrollbar.style.height = $(".vertical-scroll").height()*workingGrid.num_cells/fullGrid.num_cells + 'px';
  hscrollbar.style.width = $(".horiz-scroll").width()*workingGrid.num_cells/fullGrid.num_cells + 'px';

  if ($(".vert-bar").position().top + $(".vert-bar").height() > $(".vertical-scroll").height()) $(".vert-bar").css('top', $(".vertical-scroll").height() - $(".vert-bar").height() + 'px');
  if ($(".horiz-bar").position().left + $(".horiz-bar").width() > $(".horiz-scroll").width()) $(".horiz-bar").css('left', $(".horiz-scroll").width() - $(".horiz-bar").width() + 'px');
}

$("#colourPicker").on('change', function() {
  current_colour = $("#colourPicker").spectrum('get').toHexString();
});


// main code
var top_left = [0, 0], previous_grids = [];
var h_scrolling = false, v_scrolling = false;
var zoomRatio = 1.5;

var overallDiv = document.getElementById("overallCanvasDiv");
var overallCanvas = document.getElementById("overallCanvas");
var fullGrid = new Grid(1, 320, overallCanvas, overallDiv);

var canvasDiv = document.getElementById("gridCanvasDiv");
var canvas = document.getElementById("gridCanvas");
var workingGrid = new Grid(28, 20, canvas, canvasDiv);

var current_colour = $("#colourPicker").spectrum('get').toHexString();

moveWorking([0, 0]);
addWorkingGridClickHandler(workingGrid);
addFullGridClickHandler(fullGrid);
drawScrollBars();
toggleMode("pen"); // others are 'fill' and 'box'
toggleNib("small");
