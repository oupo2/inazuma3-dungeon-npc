function generate_npcs(data) {
    return data.map((d) => {
        return {
            id: d.id,
            pt: d.initial_pt,
            target_pt: {x: 0, z: 0, y: 0},
            speed: 85,
            size: d.size,
            range: d.range,
            state: 0,
            counter: 0,
            move_counter: 0
        };
    });
}

function handle_all_npcs(obstacles, characters, prng, frame) {
    for (let character of characters) {
        log_character(frame, "decide", character);
        if (character.state == 0) {
            decide_next_move(character, prng);
        }
        log_character(frame, "update", character);
        npc_update(obstacles, character);
    }
}

function log_character(frame, mode, character) {
    console.log(frame+" "+mode+": "+character.id+" state="+character.state+" counter="+character.counter+
    " move_counter="+character.move_counter+" pt=["+character.pt.x+", "+character.pt.z+", "+character.pt.y+"]"+
    " target=["+character.target_pt.x+", "+character.target_pt.z+", "+character.target_pt.y+"]");
}

function npc_update(obstacles, character) {
    let DEC = 2;
    switch (character.state) {
        case 1: // 待機中
            if (character.counter <= DEC) {
                character.counter = 0;
                character.state = 0;
            } else {
                character.counter -= DEC;
            }
            break;
        case 2: // 動き中
            if (move_npc(obstacles, character) != 0) {
                character.state = 1;
            }
            break;
    }
}

function move_npc(obstacles, character) {
    let d = distance_2d(character.pt, character.target_pt);
    //console.log(d);
    if (d <= 34) {
        return 1;
    }
    let result = 0;
    let r = Math.min(d - 17, character.speed * 2);
    let vec = calc_vector(character.pt, character.target_pt, r);
    //console.log("vec=", vec);
    let pt = vector_add(vec, character.pt);
    let [res, new_pt, new_pt2] = calc_new_coordinate(obstacles, character, character.pt, pt);
    //console.log(new_pt2);
    if (res != 1) console.log("res="+res);
    let d2 = 0;
    if ((res & 1) == 0) {
        result = 1;
    } else {
        d2 = distance_2d(character.pt, new_pt2);
    }
    character.pt = new_pt2;
    character.move_counter --;
    if (character.move_counter < 0) {
        return 1;
    } else {
        return result;
    }
}

function calc_vector(pt1, pt2, r) {
    let diff = vector_sub(pt2, pt1);
    let vec = {x: diff.x, z: 0, y: diff.y};
    let dist = distance_3d(vec, {x: 0, z: 0, y: 0});
    return {
        x: floor2(vec.x * r / dist),
        z: floor2(vec.z * r / dist),
        y: floor2(vec.y * r / dist)
    };
}

function calc_new_coordinate(obstacles, character, pt1, pt2) {
    //console.log("calc_new_coordinate");
    //console.log(pt1);
    //console.log(pt2);
    let [res, new_pt] = adjust_upper(obstacles, character, pt1, pt2);
    //console.log("adjust_upper res="+res);
    //console.log(new_pt);
    if ((res & 1) == 0) {
        return [res, pt2, new_pt];
    } else {
        return [res, new_pt, new_pt];
    }
}

function adjust_upper(obstacles, character, pt1, pt2) {
    let [collided, new_pt] = adjust(obstacles, pt2, character);
    //console.log("adjust collided="+collided);
    //console.log(new_pt);
    if (collided) {
        let d = distance_2d(pt1, new_pt);
        if (d < 150) {
            return [4, pt1];
        } else {
            return [5, new_pt];
        }
    } else {
        return [1, new_pt];
    }
}

function adjust(obstacles, pt, character) {
    return round_and_avoid_obstacles(obstacles, character, pt);
}


function decide_next_move(character, prng) {
    let DIR_MAP = [
        {x: 4096, y: 0},
        {x: 2896, y: 2896},
        {x: 0, y: 4096},
        {x: -2896, y: 2896},
        {x: -4096, y: 0},
        {x: -2896, y: -2896},
        {x: 0, y: -4096},
        {x: 2896, y: -2896},
    ];
    let sleep_time = prng.rand(10) * 9 + 90;
    let in_rect = point_in_rect(character.pt, character.range);
    let target_x, target_y;
    if (!in_rect) {
        target_x = floor2((character.range.xmin + character.range.xmax) / 2);
        target_y = floor2((character.range.ymin + character.range.ymax) / 2);
        let new_pt = {x: target_x, z: 0, y: target_y};
        character.target_pt = new_pt;
        character.state = 2;
        character.counter = sleep_time;
        character.move_counter = floor2((distance_2d(character.pt, new_pt) - 17) / 17);
    } else {
        prng.rand(2);
        let dist = (prng.rand(2) + 1) * 2730;
        let dir = prng.rand(8);
        let vec = {x: floor2(DIR_MAP[dir].x * dist / 4096), z: 0, y: floor2(DIR_MAP[dir].y * dist / 4096)};
        //console.log("vec=", vec);
        let new_pt = vector_add(character.pt, vec);
        if (!point_in_rect(new_pt, character.range)) {
            character.state = 1;
            character.counter = sleep_time;
        } else {
            character.target_pt = new_pt;
            character.state = 2;
            character.counter = sleep_time;
            character.move_counter = floor2((distance_2d(character.pt, new_pt) - 17) / 17);
        }
    }
}

function point_in_rect(pt, range) {
    return range.xmin <= pt.x && pt.x <= range.xmax && range.ymin <= pt.y && pt.y <= range.ymax; 
}

function round_and_avoid_obstacles(obstacles, character, pt) {
    //console.log("round_and_avoid: ", pt);
    let K = 8;
    let collided;
    pt = {x: floor2(pt.x / K), z: floor2(pt.z / K), y: floor2(pt.y / K)};
    [collided, pt] = avoid_obstacles(obstacles, character, pt);
    pt = {x: pt.x * K, z: pt.z * K, y: pt.y * K};
    return [collided, pt];
}

function avoid_obstacles(obstacles, character, pt) {
    //console.log("avoid_obstacle", pt);
    let size = character.size;
    let l_10 = -1;
    let l_14 = -1;
    let num = obstacles.length;
    let c_pt = {x: 0, z: 0, y: 0};
    let l_c;
    let collided = false;
    do {
        l_c = 0;
        for (let obstacle_id = 0; obstacle_id < num; obstacle_id ++) {
            let obstacle = obstacles[obstacle_id];
            if (l_14 == obstacle_id) continue;
            if (pt.x < obstacle.min_coordinate.x - size ||
                pt.x > obstacle.max_coordinate.x + size ||
                pt.z < obstacle.min_coordinate.z - size ||
                pt.z > obstacle.max_coordinate.z + size ||
                pt.y < obstacle.min_coordinate.y - size ||
                pt.y > obstacle.max_coordinate.y + size) {
                    continue;
            }
            let res = pt;
            let innerprod = inner_product(obstacle.coefficient, pt);
            let len = distance_3d(obstacle.coefficient, {x: 0, z: 0, y: 0});
            let proj = div_and_mult4096(innerprod - obstacle.d, len);
            let a = Math.abs(proj);
            if (a >= size) continue;
            //console.log(obstacle_id);
            //console.log([a,size]);
            //console.log(pt);
            let coefficient_xy = {x: obstacle.coefficient.x, z: 0, y: obstacle.coefficient.y};
            coefficient_xy = normalize(coefficient_xy);
            res = scale_add(- proj, coefficient_xy, res);
            let hit_res = hit(obstacle.coordinates, obstacle.coefficient, res);
            //console.log("hit_res=", hit_res);
            if (hit_res > 0) {
                if (l_10 == obstacle_id) {
                    pt = c_pt;
                    collided = true;
                    break;
                } else {
                    pt = scale_add(size + 2, coefficient_xy, res);
                    l_10 = l_14;
                    l_14 = obstacle_id;
                    l_c = 1;
                    collided = true;
                    break;        
                }
            }
            let hit_index = - (1 + hit_res);
            let diff = vector_sub(obstacle.coordinates[hit_index], obstacle.coordinates[(hit_index + 2) % 3]);
            //console.log("diff=", diff);
            let proj_dist;
            [proj_dist, res] = project(obstacle.coordinates[(hit_index + 2) % 3], diff, pt);
            //console.log([proj_dist, size]);
            if (proj_dist < size) {
                if (l_10 == obstacle_id) {
                    pt = c_pt;
                    collided = true;
                    break;
                }
                res = {x: res.x, z: pt.z, y: res.z};
                pt = diff_and_scale_and_add(pt, res, size + 2);
                l_c = 1;
                l_14 = obstacle_id;
                collided = true;
                break;
            }
        }
    } while (l_c != 0);
    //console.log("avoid_obstacle ret=", pt);
    return [collided, pt];
}

function diff_and_scale_and_add(pt1, pt2, scaler) {
    let diff = vector_sub(pt1, pt2);
    let vec = normalize(diff);
    return scale_add(scaler, vec, pt2);

}

function project(pt0, vec, pt2) {
    //console.log("project: ", pt0, vec, pt2);
    let prod1 = round((vec.x * (pt0.x - pt2.x) / 4096) + round(vec.y * (pt0.y - pt2.y) / 4096));
    let prod2 = -(round(vec.x * vec.x / 4096) + round(vec.y * vec.y / 4096));
    //console.log(prod1+","+(-prod2));
    if (prod2 != 0) {
        prod1 = div_and_mult4096(prod1, prod2);
    }
    //console.log(prod1);
    let res;
    if (prod1 <= 0) {
        res = pt0;
    } else if (prod1 >= 4096) {
        res = vector_add(pt0, vec);
    } else {
        res = scale_add(prod1, vec, pt0);
    }
    return [distance_3d(pt2, res), res];
}

function hit(obstacle_points, vec, pt) {
    //console.log("hit: ", obstacle_points, vec, pt);
    let center = {
        x: floor2((obstacle_points[0].x + obstacle_points[1].x + obstacle_points[2].x) / 3),
        z: floor2((obstacle_points[0].z + obstacle_points[1].z + obstacle_points[2].z) / 3),
        y: floor2((obstacle_points[0].y + obstacle_points[1].y + obstacle_points[2].y) / 3),
    };
    //console.log(center);
    let diff = vector_sub(center, pt);
    if (diff.x == 0 && diff.z == 0 && diff.y == 0) {
        return 1;
    }
    //console.log(diff);
    diff = normalize(diff);
    //console.log(diff);
    pt = scale_add(20, diff, pt);
    //console.log(pt);
    let i = 0;
    for (; i < 3; i ++) {
        //console.log(i);
        let prev = (i + 2) % 3;
        let obs_coord = obstacle_points[i];
        let obs_coord_prev = obstacle_points[prev];
        let diff2 = vector_sub(obs_coord, obs_coord_prev);
        let diff3 = vector_sub(pt, obs_coord_prev);
        let outerprod = outer_product(diff2, diff3);
        //console.log(outerprod);
        let innerprod = inner_product(vec, outerprod);
        //console.log(innerprod);
        if (innerprod < 0) break;
    }
    if (i == 3) {
        return 1;
    } else {
        return -(i + 1);
    }
}

function floor(z) {
    return Math.floor(z);
}

function floor2(z) {
    return z > 0 ? Math.floor(z) : Math.ceil(z);
}

function round(z) {
    return Math.round(z);
}

function div_and_mult4096(x, y) {
    return round(x * 4096 / y);
}

function vector_add(p, q) {
    return {x: p.x + q.x, z: p.z + q.z, y: p.y + q.y};
}

function vector_sub(p, q) {
    return {x: p.x - q.x, z: p.z - q.z, y: p.y - q.y};
}

function scale_add(scaler, vec, pt) {
    //console.log("scale_add: ", scaler, vec, pt);
    return {
        x: pt.x + floor(vec.x * scaler / 4096),
        z: pt.z + floor(vec.z * scaler / 4096),
        y: pt.y + floor(vec.y * scaler / 4096)
    };
}

function distance_2d(p, q) {
    return floor(Math.hypot(p.x - q.x, p.y - q.y));
}

function distance_3d(p, q) {
    return floor(Math.hypot(p.x - q.x, p.z - q.z, p.y - q.y));
}

function normalize(vec) {
    let dist = distance_3d(vec, {x: 0, z: 0, y: 0});
    return {
        x: floor(vec.x * 4096 / dist),
        z: floor(vec.z * 4096 / dist),
        y: floor(vec.y * 4096 / dist)
    };
}

function inner_product(p, q) {
    return round((p.x * q.x + p.z * q.z + p.y * q.y) / 4096);
}

function outer_product(p, q) {
    return {
        x: round((p.z * q.y - p.y * q.z) / 4096),
        z: round((p.y * q.x - p.x * q.y) / 4096),
        y: round((p.x * q.z - p.z * q.x) / 4096)
    }
}


function test_projection() {
    let DATA = [-1364, -1489, -2443, -832, 835, 763, 1731, 3431, -3063, 3795, 277, 1778, 1828, 2647, 3142, 3544, 2648, -628, 2362, -3391, 3558, -1497, -1961, -1874, 3672, -1199, -2395, -3559, -1203, 2120, 2825, 1940, -1933, 976, 755, 3781, -2050, -2225, 3503, -1600, 2898, -3997, -2088, 3249, -3341, -3299, -3437, -877, 2958, -3673, 3360, 4033, -759, -1351, 639, -3552, 2591, -3382, -1804, -3945, -1373, 2558, -565, -1166, -2889, 2076, -3294, -1920, -1920, -2140, 3125, 1925, -474, -536, -3340, 273, 2383, 388, -2455, -982, 1466, 2591, 888, 257, 1345, -25, -87, -1991, 2339, -154];
    let NUM = DATA.length / 9;
    for (let i = 0; i < NUM; i ++) {
        let ii = i * 9;
        let pt0 = {x: DATA[ii+0], z: DATA[ii+1], y: DATA[ii+2]};
        let vec = {x: DATA[ii+3], z: DATA[ii+4], y: DATA[ii+5]};
        let pt2 = {x: DATA[ii+6], z: DATA[ii+7], y: DATA[ii+8]};
        console.log([pt0, vec, pt2]);
        console.log(project(pt0, vec, pt2));
    }
}

function test_hit() {
    console.log(hit([{x:-2502,z:-2048,y:-8724},{x:2561,z:5120,y:-8724},{x:-2502,z:5120,y:-8724}],{x:0,z:0,y:4096}, {x:227,z:163,y:-8724}));
}

function test_avoid(obstacles) {
    function rnd() { return Math.floor(Math.random() * 10000 - 5000); }
    for (let i = 0; i < 300000; i ++) {      
        avoid_obstacles(obstacles, {pt: {x: rnd(),z: rnd(),y: rnd()}, size: 170}, {x:rnd(),z:rnd(),y:rnd()});
    }
    console.log("ok");
}

