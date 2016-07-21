var canvas = document.getElementById("gridCanvas");
var ctx = canvas.getContext("2d");

// create a class for our grid
var Grid = function(cell_size, num_cells){
  this.min_x = (canvas.width - num_cells*cell_size)/2;
  this.min_y = (canvas.height - num_cells*cell_size)/2;
  this.cell_size = cell_size;
  this.num_cells = num_cells;
}

// draw the gridlines
Grid.prototype.draw = function() {
  for (i=0; i<=this.num_cells; i++){
    ctx.beginPath();

    ctx.setLineDash([this.cell_size/6, this.cell_size/6]);
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = this.cell_size/80;

    ctx.moveTo(this.min_x + i*this.cell_size, this.min_y);
    ctx.lineTo(this.min_x + i*this.cell_size, this.min_y + this.num_cells*this.cell_size);

    ctx.moveTo(this.min_x, this.min_y + i*this.cell_size);
    ctx.lineTo(this.min_x + this.num_cells*this.cell_size, this.min_y + i*this.cell_size);
    ctx.stroke();
  }
}

// function to colour a cell, x and y is upper left corner of the cell
Grid.prototype.colourCell = function(x, y, colour) {
  // make sure the click is in the grid
  if (x <=this.min_x + (this.num_cells-1)*this.cell_size && x>= this.min_x && y <=this.num_cells*this.cell_size){
    ctx.beginPath();
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, this.cell_size, this.cell_size);
    ctx.closePath();
  }
}

// use a closure to pass the grid to the click handlers
function addClickHandler(grid) {
  document.addEventListener('click', function(e){
    // colour the grid cell if clicked
    // need the upper left corner of the cell
    var x = grid.min_x + grid.cell_size*Math.floor((e.clientX - canvas.offsetLeft - grid.min_x)/grid.cell_size);
    var y = grid.min_y + grid.cell_size*Math.floor((e.clientY - grid.min_y)/grid.cell_size);
    grid.colourCell(x, y, current_colour);
  }, false);
}

var myGrid = new Grid(30, 20);
var current_colour = 'rgb(0, 0, 0)'

addClickHandler(myGrid);

myGrid.draw();
