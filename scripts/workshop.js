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

Grid.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
  this.clear();
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

  var num_adjacent_to_colour = 0;
  if (nib_size === "medium") num_adjacent_to_colour = 1;
  else if (nib_size === "large") num_adjacent_to_colour = 2;

  for (i=-num_adjacent_to_colour; i<=num_adjacent_to_colour; i++){
    for (j=-num_adjacent_to_colour; j<=num_adjacent_to_colour; j++){
      if (this.inGrid(x+i, y+j) && this.coloured_cells[[x+i, y+j]] != current_colour) {
        changed = true;
        this.coloured_cells[[x+i, y+j]] = current_colour;
        drawOverall(x+i, y+j);
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

Grid.prototype.colourBox = function(initialX, initialY, finalX, finalY) {
  var changed = false;
  previous_grids.push(Object.assign({}, fullGrid.coloured_cells));
  for (x=Math.min(initialX, finalX); x<=Math.max(initialX, finalX); x++){
    for (y=Math.min(initialY, finalY); y<=Math.max(initialY, finalY); y++){
      if (this.inGrid(x, y) && this.coloured_cells[[x, y]] != current_colour) {
        changed = true;
        this.coloured_cells[[x, y]] = current_colour;
        drawOverall(x, y);
      }
    }
  }

  this.redraw();

  if (!changed) previous_grids.pop();
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
  previous_grids.push(Object.assign({}, fullGrid.coloured_cells));

  if (this.inGrid(x, y)){
    var colour = this.coloured_cells[[x, y]];

    if (colour != current_colour) changed = true;

    if (changed){
      this.clear();
      this.colourGrid();
      var to_colour = [[x, y]], visited = [[x, y]];

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
        visited.push(to_visit);
      }

      for (var index in to_colour){
        this.colourCell(to_colour[index][0], to_colour[index][1], current_colour);
      }
      this.drawGridlines();
    }
  }

  if (!changed) previous_grids.pop();
}

function getRawX(e) {
  return e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
}

function getRawY(e) {
  return e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
}


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
    if (mode === "fill") grid.fill(grid.getLeftX(e), grid.getTopY(e));
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

      if (grid.inGrid(initialX, initialY)){
        drag_started = true;
        previous_grids.push(Object.assign({}, fullGrid.coloured_cells));
      }
    }
    else {
      held_down = true;
      previous_grids.push(Object.assign({}, fullGrid.coloured_cells));
      if (mode === "pen") grid.pen(initialX, initialY);
      else if (mode === "eraser") grid.eraser(initialX, initialY);
    }
  }, false);

  grid.canvas.addEventListener('mouseup', function(e) {
    if (v_scrolling || h_scrolling) {
      v_scrolling = false;
      h_scrolling = false;
    }
    if (drag_started){
      grid.clear();
      grid.colourGrid();

      var finalX = grid.getLeftX(e);
      var finalY = grid.getTopY(e);

      grid.colourBox(initialX, initialY, finalX, finalY);
      drag_started = false;
    }

    held_down = false;

  }, false);

  grid.canvas.addEventListener('mousemove', function(e) {
    if (drag_started) {
      grid.clear();
      grid.colourGrid();

      var currentX = getRawX(e);
      var currentY = getRawY(e);

      if (currentX < grid.min_x + grid.div.offsetLeft) currentX = grid.min_x + grid.div.offsetLeft;
      else if (currentX > grid.max_x + grid.div.offsetLeft) currentX = grid.min_x + grid.div.offsetLeft + grid.cell_size*grid.num_cells;
      if (currentY < grid.min_y + grid.div.offsetTop) currentY = grid.min_y + grid.div.offsetTop;
      else if (currentY > grid.max_y + grid.div.offsetTop) currentY = grid.min_y + grid.div.offsetTop + grid.cell_size*grid.num_cells;

      width = currentX - rawInitialX;
      height = currentY - rawInitialY;

      grid.drawDragBox(rawInitialX, rawInitialY, width, height);
      grid.drawGridlines();
    }
    else if(held_down && !v_scrolling && !h_scrolling){
      var x = grid.getLeftX(e);
      var y = grid.getTopY(e);
      if (mode === "pen") grid.pen(x, y);
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
  fullGrid.clear();
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

function moveWorking(move_to) {
  move_to = [Math.floor(move_to[0]), Math.floor(move_to[1])];
  var max = fullGrid.num_cells - workingGrid.num_cells;
  top_left = [Math.min(Math.max(move_to[0], 0), max), Math.min(Math.max(move_to[1], 0), max)];

  workingGrid.clear();
  workingGrid.coloured_cells = [];
  colourWorkingGrid();
  workingGrid.drawGridlines();
  drawContextBox();
}

function drawOverall(working_x, working_y) {
  var coords = [working_x, working_y];
  var colour = workingGrid.coloured_cells[coords];

  coords[0] += top_left[0];
  coords[1] += top_left[1];

  fullGrid.colourCell(coords[0], coords[1], colour, false);
}

var button = document.getElementById('btn-download');
button.addEventListener('click', function (e) {
  var canvas = document.createElement('canvas');
  var scale_factor = 2;
  canvas.width = 400*scale_factor;
  canvas.height = 350*scale_factor;

  // Get the drawing context
  var ctx = canvas.getContext('2d');

  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.fill();

  for (var cell in fullGrid.coloured_cells){
    cell = cell.split(',');
    cell = [parseInt(cell[0], 10), parseInt(cell[1], 10)];
    ctx.beginPath();
    ctx.fillStyle = fullGrid.coloured_cells[cell];
    ctx.fillRect(cell[0]*scale_factor, cell[1]*scale_factor, fullGrid.cell_size*scale_factor, fullGrid.cell_size*scale_factor);
    ctx.closePath();
  }
  ctx.strokeRect(0, 0, canvas.width, canvas.height);  // a border
  var img = canvas.toDataURL("image/png");
  // document.write('<img src="'+img+'"/>');
  button.href = img;

});

function savePicture() {
  console.log(fullGrid.coloured_cells);
  var canvas = document.createElement('canvas');
  var scale_factor = 2;
  canvas.width = 400*scale_factor;
  canvas.height = 350*scale_factor;

  // Get the drawing context
  var ctx = canvas.getContext('2d');

  for (var cell in fullGrid.coloured_cells){
    cell = cell.split(',');
    cell = [parseInt(cell[0], 10), parseInt(cell[1], 10)];
    ctx.beginPath();
    ctx.fillStyle = fullGrid.coloured_cells[cell];
    ctx.fillRect(cell[0]*scale_factor, cell[1]*scale_factor, fullGrid.cell_size*scale_factor, fullGrid.cell_size*scale_factor);
    ctx.closePath();
  }
  ctx.strokeRect(0, 0, canvas.width, canvas.height);  // a border
  var img = canvas.toDataURL("image/png");
  // document.write('<img src="'+img+'"/>');
  var button = document.getElementById("save-button");
  button.href = img;

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
  if (previous_grids.length > 0){
    fullGrid.coloured_cells = previous_grids.pop();

    fullGrid.clear();
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
  workingGrid.clear();
  workingGrid.coloured_cells = [];
  colourWorkingGrid();
  workingGrid.drawGridlines();
  drawContextBox();
  updateScrollBarDimensions();
}

function zoomOut() {
  var max_num_cells = fullGrid.num_cells/4;
  if (workingGrid.num_cells*zoomRatio <= max_num_cells) {
    workingGrid.num_cells = Math.ceil(zoomRatio*workingGrid.num_cells);
  } else {
    workingGrid.num_cells = max_num_cells;
  }
  workingGrid.cell_size = workingGrid.area/workingGrid.num_cells;

  var max = fullGrid.num_cells - workingGrid.num_cells;
  top_left = [Math.min(Math.max(top_left[0], 0), max), Math.min(Math.max(top_left[1], 0), max)];

  workingGrid.reset()
  workingGrid.clear();
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

// ----------------------------------------------------------------------
// MAIN CODE

var top_left = [0, 0], previous_grids = [];
var h_scrolling = false, v_scrolling = false;
var zoomRatio = 1.5;

var overallDiv = document.getElementById("overallCanvasDiv");
var overallCanvas = document.getElementById("overallCanvas");
var full_cell_size = 1;
var full_grid_num_cells = 320;
var fullGrid = new Grid(full_cell_size, full_grid_num_cells, overallCanvas, overallDiv);

var canvasDiv = document.getElementById("gridCanvasDiv");
var canvas = document.getElementById("gridCanvas");
var working_grid_cell_size = 28;
var workingGrid = new Grid(working_grid_cell_size, full_grid_num_cells/16, canvas, canvasDiv);

var current_colour = $("#colourPicker").spectrum('get').toHexString();

moveWorking(top_left);
addWorkingGridClickHandler(workingGrid);
addFullGridClickHandler(fullGrid);
drawScrollBars();
toggleMode("pen"); // others are 'fill' and 'box'
toggleNib("small");
