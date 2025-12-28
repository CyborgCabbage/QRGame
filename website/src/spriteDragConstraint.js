import Matter from 'matter-js'

export var SpriteDragConstraint = {};

SpriteDragConstraint.create = function(engine, canvas) {
    var mouse = Matter.Mouse.create(canvas);
    var constraint = Matter.Constraint.create({ 
        label: 'Sprite Drag Constraint',
        pointA: mouse.position,
        pointB: { x: 0, y: 0 },
        length: 0.01, 
        stiffness: 0.1,
        angularStiffness: 1,
        render: {
            strokeStyle: '#90EE90',
            lineWidth: 3
        }
    });

    var spriteDragConstraint  = {
        type: 'spriteDragConstraint',
        mouse: mouse,
        element: canvas,
        body: null,
        constraint: constraint,
        collisionFilter: {
            category: 0x0001,
            mask: 0xFFFFFFFF,
            group: 0
        }
    };

    Matter.Events.on(engine, 'beforeUpdate', function() {
        var allBodies = Matter.Composite.allBodies(engine.world);
        SpriteDragConstraint.update(spriteDragConstraint, allBodies);
        SpriteDragConstraint._triggerEvents(spriteDragConstraint);
    });

    return spriteDragConstraint;
};

/**
 * Updates the given mouse constraint.
 * @private
 * @method update
 * @param {SpriteDragConstraint} spriteDragConstraint
 * @param {body[]} bodies
 */
SpriteDragConstraint.update = function(spriteDragConstraint, bodies) {
    var mouse = spriteDragConstraint.mouse,
        constraint = spriteDragConstraint.constraint,
        body = spriteDragConstraint.body;
    if (mouse.button === 0) {
        if (!constraint.bodyB) {
            for (var i = 0; i < bodies.length; i++) {
                body = bodies[i];
                if (body.plugin.drag 
                        && Matter.Bounds.contains(body.bounds, mouse.position) 
                        && Matter.Detector.canCollide(body.collisionFilter, spriteDragConstraint.collisionFilter)) {
                    
                    for (var j = body.parts.length > 1 ? 1 : 0; j < body.parts.length; j++) {
                        var part = body.parts[j];
                        if (Matter.Vertices.contains(part.vertices, mouse.position)) {
                            constraint.pointA = mouse.position;
                            constraint.bodyB = spriteDragConstraint.body = body;
                            constraint.pointB = { x: mouse.position.x - body.position.x, y: mouse.position.y - body.position.y };
                            constraint.angleB = body.angle;
                            
                            Matter.Sleeping.set(body, false);
                            Matter.Events.trigger(spriteDragConstraint, 'startdrag', { mouse: mouse, body: body });

                            break;
                        }
                    }
                }
            }
        } else {
            Matter.Sleeping.set(constraint.bodyB, false);
            constraint.pointA = mouse.position;
        }
    } else {
        constraint.bodyB = spriteDragConstraint.body = null;
        constraint.pointB = null;

        if (body)
            Matter.Events.trigger(spriteDragConstraint, 'enddrag', { mouse: mouse, body: body });
    }
};

/**
 * Triggers mouse constraint events.
 * @method _triggerEvents
 * @private
 * @param {mouse} spriteDragConstraint
 */
SpriteDragConstraint._triggerEvents = function(spriteDragConstraint) {
    var mouse = spriteDragConstraint.mouse,
        mouseEvents = mouse.sourceEvents;

    if (mouseEvents.mousemove)
        Matter.Events.trigger(spriteDragConstraint, 'mousemove', { mouse: mouse });

    if (mouseEvents.mousedown)
        Matter.Events.trigger(spriteDragConstraint, 'mousedown', { mouse: mouse });

    if (mouseEvents.mouseup)
        Matter.Events.trigger(spriteDragConstraint, 'mouseup', { mouse: mouse });

    // reset the mouse state ready for the next step
    Matter.Mouse.clearSourceEvents(mouse);
};
