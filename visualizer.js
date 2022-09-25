function drawArrow(ctx, x1, y1, x2, y2) {
    let len = Math.hypot(x1 - x2, y1 - y2);
    let len2 = len * 0.7;
    let v0 = (x2 - x1) / len;
    let v1 = (y2 - y1) / len;
    ctx.save();
    ctx.beginPath();
    ctx.translate(x1, y1);
    ctx.scale(1, -1);
    ctx.transform(v0, -v1, v1, v0, 0, 0);
    console.log(v0, -v1, v1, v0, 0, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(len, 0);
    ctx.lineTo(len - len2, len2);
    ctx.moveTo(len, 0);
    ctx.lineTo(len - len2, -len2);
    ctx.stroke();
    ctx.restore();
}

function visualize(prng, frame_length, judge) {
    let prng_copy = prng.clone();
    let NPC_PERM = [0, 2, 1];
    let npcs = generate_npcs(NPC_DATA);
    let prev_state = [-1, -1, -1];
    let prev_advancement = 0;
    let events = [];
    let walking = [null, null, null];
    let last_prng_advance_event = null;
    for (let frame = 0; frame < frame_length; frame ++) {
        handle_all_npcs(OBSTACLE_DATA, npcs, prng);
        if (prng.advancement != prev_advancement) {
            events.push({type: "prng_advance", frame: frame, advance: prng.advancement});
            if (last_prng_advance_event) {
                last_prng_advance_event.len = frame - last_prng_advance_event.frame;
            }
            last_prng_advance_event = events[events.length - 1];
        }
        for (let i = 0; i < npcs.length; i ++) {
            let npc = npcs[i];
            if (npc.state == 2 && prev_state[i] != 2) {
                walking[i] = {frame: frame, pt: npc.pt};
            }
            if (npc.state != 2 && prev_state[i] == 2) {
                if (walking[i]) {
                    events.push({type: "walk", start_frame: walking[i].frame, end_frame: frame, npc_index: i, start_pt: walking[i].pt, end_pt: npc.pt});
                }
            }
            prev_state[i] = npc.state;
        }
        prev_advancement = prng.advancement;
    }
    let canvas = document.createElement("canvas");
    let HEIGHT_PER_FRAME = 3;
    let SCALE = 1/300;
    canvas.width = 400;
    canvas.height = 20 + frame_length * HEIGHT_PER_FRAME;
    let ctx = canvas.getContext("2d");
    for (let event of events) {
        let frame = event.frame;
        switch (event.type) {
            case "prng_advance":
                ctx.textBaseline = "top";
                let p = prng_copy.clone();
                p.step(event.advance - prng_copy.advancement);
                if (judge(p)) {
                    ctx.fillStyle = "pink";
                    ctx.fillRect(10, 10 + frame * HEIGHT_PER_FRAME, 400, event.len * HEIGHT_PER_FRAME);
                    ctx.font = "bold 10px sans-serif";
                    ctx.fillStyle = "red";
                    ctx.fillText("消費: "+event.advance, 10, 10 + frame * HEIGHT_PER_FRAME);
                    ctx.fillText("フレーム: "+event.frame, 10, 10 + frame * HEIGHT_PER_FRAME + 10);
                } else {
                    ctx.font = "10px sans-serif";
                    ctx.fillStyle = "black";
                    ctx.fillText("消費: "+event.advance, 10, 10 + frame * HEIGHT_PER_FRAME);
                }
                break;
            case "walk":
                ctx.fillStyle = "#a6e9e2";
                ctx.fillRect(100 + NPC_PERM[event.npc_index] * 100, 10 + event.start_frame * HEIGHT_PER_FRAME, 100, (event.end_frame - event.start_frame) * HEIGHT_PER_FRAME);
                let range = npcs[event.npc_index].range;
                let w = Math.floor((range.xmax - range.xmin) * SCALE);
                let h = Math.floor((range.ymax - range.ymin) * SCALE);
                ctx.save();
                ctx.translate(100 + NPC_PERM[event.npc_index] * 100 + 10, 10 + event.start_frame * HEIGHT_PER_FRAME + 10);
                ctx.fillStyle = "black";
                ctx.fillRect(-1, -1, w + 2, h + 2);
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = "#809ed6";
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.moveTo((event.start_pt.x - range.xmin) * SCALE, (event.start_pt.y - range.ymin) * SCALE);
                ctx.lineTo((event.end_pt.x - range.xmin) * SCALE, (event.end_pt.y - range.ymin) * SCALE);
                ctx.stroke();
                ctx.fillStyle = "#3266c8";
                ctx.beginPath();
                ctx.ellipse((event.end_pt.x - range.xmin) * SCALE, (event.end_pt.y - range.ymin) * SCALE, 4, 4, 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
        }
    }
    return canvas;
}