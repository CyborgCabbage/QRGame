import Matter from 'matter-js'

var SpriteDragConstraint = {};

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

    var defaults = {
        type: 'spriteDragConstraint',
        mouse: mouse,
        element: null,
        body: null,
        constraint: constraint,
        collisionFilter: {
            category: 0x0001,
            mask: 0xFFFFFFFF,
            group: 0
        }
    };

    var spriteDragConstraint = Matter.Common.extend(defaults, options);

    Events.on(engine, 'beforeUpdate', function() {
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
 * @param {MouseConstraint} mouseConstraint
 * @param {body[]} bodies
 */
SpriteDragConstraint.update = function(mouseConstraint, bodies) {
    var mouse = mouseConstraint.mouse,
        constraint = mouseConstraint.constraint,
        body = mouseConstraint.body;

    if (mouse.button === 0) {
        if (!constraint.bodyB) {
            for (var i = 0; i < bodies.length; i++) {
                body = bodies[i];
                if (Bounds.contains(body.bounds, mouse.position) 
                        && Detector.canCollide(body.collisionFilter, mouseConstraint.collisionFilter)) {
                    for (var j = body.parts.length > 1 ? 1 : 0; j < body.parts.length; j++) {
                        var part = body.parts[j];
                        if (Vertices.contains(part.vertices, mouse.position)) {
                            constraint.pointA = mouse.position;
                            constraint.bodyB = mouseConstraint.body = body;
                            constraint.pointB = { x: mouse.position.x - body.position.x, y: mouse.position.y - body.position.y };
                            constraint.angleB = body.angle;

                            Sleeping.set(body, false);
                            Events.trigger(mouseConstraint, 'startdrag', { mouse: mouse, body: body });

                            break;
                        }
                    }
                }
            }
        } else {
            Sleeping.set(constraint.bodyB, false);
            constraint.pointA = mouse.position;
        }
    } else {
        constraint.bodyB = mouseConstraint.body = null;
        constraint.pointB = null;

        if (body)
            Events.trigger(mouseConstraint, 'enddrag', { mouse: mouse, body: body });
    }
};

/**
 * Triggers mouse constraint events.
 * @method _triggerEvents
 * @private
 * @param {mouse} mouseConstraint
 */
SpriteDragConstraint._triggerEvents = function(mouseConstraint) {
    var mouse = mouseConstraint.mouse,
        mouseEvents = mouse.sourceEvents;

    if (mouseEvents.mousemove)
        Events.trigger(mouseConstraint, 'mousemove', { mouse: mouse });

    if (mouseEvents.mousedown)
        Events.trigger(mouseConstraint, 'mousedown', { mouse: mouse });

    if (mouseEvents.mouseup)
        Events.trigger(mouseConstraint, 'mouseup', { mouse: mouse });

    // reset the mouse state ready for the next step
    Mouse.clearSourceEvents(mouse);
};
