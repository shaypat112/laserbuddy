// Fit test: 3 servo slots (tight / normal / loose) + 3 laser holes.
// Notches on the edge = which size: 1 notch tight, 2 normal, 3 loose.
$fn=48;
tols=[0.1,0.2,0.35]; lds=[6.1,6.3,6.6];
difference(){
  union(){
    cube([96,26,4]);
    for(i=[0:2]) translate([8+i*32,20,0]) cube([16,12,12]);   // laser test blocks
  }
  for(i=[0:2]){
    t=tols[i];
    translate([16+i*32-(22.6+2*t)/2, 13-(12+2*t)/2, -1]) cube([22.6+2*t, 12+2*t, 10]);
    for(n=[0:i]) translate([4+i*32+n*4, -1, -1]) cube([2,2.5,10]);     // notches
    translate([8+i*32-1, 26, 6]) rotate([0,90,0]) cylinder(d=lds[i], h=18);  // laser bore
  }
}
