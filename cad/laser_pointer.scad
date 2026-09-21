// ===========================================================
//  LaserBuddy - pan/tilt laser pointer for SG90 servos
//  Parts: base, pan arm (with tilt-servo bracket), laser arm
//  Print: PLA, 0.2 mm layers, 3 walls, 25% infill, NO supports
//  Render one part:  openscad -D 'part="base"' -o base.stl laser_pointer.scad
//  part = "plate" | "base" | "pan" | "laser" | "cam" | "assembly"
// ===========================================================
part = "plate";
$fn = 64;

// ---------- tweakables ----------
tol        = 0.2;     // general print clearance
// SG90 servo (measure yours; these fit most SG90/MG90S)
srv_l      = 22.6 + 2*tol;   // body length (SG90 clones measure 22.2-23.0)
srv_w      = 12.0 + 2*tol;   // body width (11.8-12.2)
srv_hole_c = 27.8;           // tab screw hole spacing (center-center)
srv_shaft  = 5.9;            // shaft center distance from its end of body
pilot_d    = 1.7;            // pilot hole for the servo's M2 self-tap screws
// servo horn recess
horn_len   = 36;     // longest arm span of your horn (+ margin)
horn_w     = 7.4;    // arm width (+ margin)
horn_hub   = 8.6;    // hub diameter (+ margin)
horn_depth = 1.8;    // recess depth
access_d   = 4.6;    // hole to reach the horn center screw
// laser module
laser_d    = 6.0 + 0.3;      // common 6 mm barrel laser modules
laser_len  = 34;

// ---------- helpers ----------
module rrect(x, y, h, r=3) {          // rounded box, centered in XY
    linear_extrude(h) offset(r) square([x-2*r, y-2*r], center=true);
}
module teardrop_x(d, len) {            // horizontal hole along X, prints without support
    rotate([0,90,0]) linear_extrude(len, center=true)
        union() { circle(d=d); rotate(45) square(d/2); }
}
module horn_recess(cross=true) {       // cut on the bottom face (z=0)
    translate([0,0,-0.01]) {
        linear_extrude(horn_depth) {
            square([horn_len, horn_w], center=true);
            if (cross) square([horn_w, horn_len], center=true);
            circle(d=horn_hub);
        }
        cylinder(d=access_d, h=50);
    }
}

// ===========================================================
// 1) BASE  (modeled right-side-up; printed upside down)
// ===========================================================
base_x = 60; base_y = 50; base_h = 34; wall = 2.4; top_t = 2.6;
module base() {
    body_cx = -(srv_l/2 - srv_shaft);          // puts the servo shaft on the center axis
    chamf = 2.2;                               // lead-in depth: guides the servo in straight
    difference() {
        union() {
            difference() {
                rrect(base_x, base_y, base_h, 4);
                translate([0,0,-0.01]) rrect(base_x-2*wall, base_y-2*wall, base_h-top_t, 2);
            }
            // corner mounting columns (optional: for screwing the whole base to a shelf/board)
            for (sx=[-1,1], sy=[-1,1]) translate([sx*(base_x/2-5), sy*(base_y/2-5), 0])
                cylinder(d=9, h=base_h);
        }
        // servo body opening: press-fit only, no screws. A wide lead-in chamfer at the
        // top opening self-centers the servo so it goes in straight instead of tilted.
        translate([body_cx, 0, base_h-20]) cube([srv_l, srv_w, 40], center=true);
        translate([body_cx, 0, base_h - chamf/2 + 0.01])
            hull() {
                cube([srv_l+3, srv_w+3, 0.01], center=true);
                translate([0,0,-chamf]) cube([srv_l, srv_w, 0.01], center=true);
            }
        // corner screw holes (M3 or #4 wood screw) to fix it to a board/shelf
        for (sx=[-1,1], sy=[-1,1]) translate([sx*(base_x/2-5), sy*(base_y/2-5), -1])
            cylinder(d=3.4, h=base_h+2);
        // wire exit notch
        translate([-base_x/2, 0, 0]) cube([10, 14, 16], center=true);
        translate([ base_x/2, 0, 0]) cube([10, 14, 16], center=true);
        // shaft-center mark on top (small dimple)
        translate([0, base_y/2-6, base_h-0.6]) cylinder(d=2, h=1);
    }
}

// ===========================================================
// 2) PAN ARM  (platform on pan horn + vertical tilt-servo wall)
//    printed as modeled: platform flat on the bed
// ===========================================================
plat_r = 22; plat_t = 4;
wall_x0 = 14; wall_t = 4; wall_wy = 24;
tab_gap = 6;                             // platform top -> bottom of servo opening
z0 = plat_t + tab_gap;                   // bottom of servo opening in wall
wall_top = z0 + srv_l + 7;
module pan_arm() {
    difference() {
        union() {
            // D-shaped platform (cut so the laser arm can swing down freely)
            intersection() {
                cylinder(r=plat_r, h=plat_t);
                translate([-50+wall_x0+wall_t+1, -50, 0]) cube([50, 100, plat_t]);
            }
            // tilt servo wall
            translate([wall_x0, -wall_wy/2, 0]) cube([wall_t, wall_wy, wall_top]);
            // stiffening ribs behind the wall
            for (sy=[-1,1]) translate([0, sy*(wall_wy/2-1) - 1, 0])
                hull() {
                    translate([wall_x0-0.01, 0, 0]) cube([0.01, 2, wall_top-4]);
                    translate([wall_x0-11, 0, 0]) cube([0.01, 2, plat_t]);
                }
        }
        // pan horn recess (rotated 45 deg so it stays inside the D-cut)
        rotate(45) horn_recess(true);
        // tilt servo opening through the wall: press-fit only, no screws. Slides in from
        // the back (-X); a lead-in chamfer on that face self-centers it going in straight.
        translate([wall_x0-1, -srv_w/2, z0]) cube([wall_t+2, srv_w, srv_l]);
        translate([wall_x0-1-0.01, 0, z0+srv_l/2])
            hull() {
                cube([0.01, srv_w+3, srv_l+3], center=true);
                translate([2.2,0,0]) cube([0.01, srv_w, srv_l], center=true);
            }
    }
}
function tilt_axis_z() = z0 + srv_l - srv_shaft;

// ===========================================================
// 3) LASER ARM  (screws onto the tilt servo horn, holds 6 mm laser)
//    printed as modeled: pad flat on the bed, laser bore horizontal
// ===========================================================
pad_t = 4;
blk_y0 = 5; blk_w = 12; blk_h = 11;
module laser_arm() {
    difference() {
        union() {
            translate([-21, -9, 0]) linear_extrude(pad_t)
                offset(3) offset(-3) square([42, blk_y0 + blk_w + 9]);
            translate([-laser_len/2, blk_y0, 0]) cube([laser_len, blk_w, pad_t + blk_h]);
        }
        horn_recess(false);                                  // single/double-arm horn
        // laser bore
        translate([0, blk_y0 + blk_w/2, pad_t + blk_h/2]) teardrop_x(laser_d, laser_len + 2);
        // set-screw / glue hole (M2.5-M3 self-tap) from the top
        translate([laser_len/2 - 7, blk_y0 + blk_w/2, pad_t + blk_h/2]) cylinder(d=2.5, h=20);
    }
}

// ===========================================================
// 4) WEBCAM ADAPTER  (Logitech C270 clip hooks over it; a 1/4"-20 nut
//    in the top lets it screw onto any camera arm / tripod screw)
// ===========================================================
cam_x = 64; cam_y = 36; cam_t = 8;
nut_af = 11.11 + 0.4;   // 1/4"-20 hex nut, 7/16" across flats + clearance
nut_h  = 5.6 + 0.4;
module cam_adapter() {
    difference() {
        rrect(cam_x, cam_y, cam_t, 4);
        translate([0,0,-1]) cylinder(d=6.8, h=cam_t+2);                       // screw hole
        translate([0,0,cam_t-nut_h]) cylinder(d=nut_af/cos(30), h=nut_h+1, $fn=6); // nut pocket (open on top)
        // grip grooves so the rubber pad of the clip doesn't slide
        for (x=[-24,-18,18,24]) translate([x,0,cam_t-0.6]) cube([2,cam_y-8,2], center=true);
    }
}

// ===========================================================
// layouts
// ===========================================================
module plate() {   // everything laid out flat, print-ready, fits a 220x220 bed
    translate([-45, 0, base_h]) rotate([180,0,0]) base();  // upside down
    translate([ 25, 30, 0]) pan_arm();
    translate([ 30, -25, 0]) laser_arm();
    translate([-45, -55, 0]) cam_adapter();
}
module assembly() {  // rough visual check of how it goes together
    color("lightgray") base();
    translate([0,0,base_h + 16.5]) {
        color("orange") pan_arm();
        color("skyblue") translate([wall_x0 + wall_t + 9.3, 0, tilt_axis_z()])
            rotate([90,0,90]) rotate([0,0,-90]) laser_arm();
    }
}

if (part == "plate")    plate();
if (part == "base")     base();
if (part == "pan")      pan_arm();
if (part == "laser")    laser_arm();
if (part == "cam")      cam_adapter();
if (part == "assembly") assembly();
