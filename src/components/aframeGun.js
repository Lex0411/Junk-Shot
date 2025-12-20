// A-Frame Gun Component - attaches 3D gun model to camera and handles shooting visuals

AFRAME.registerComponent('gun-component', {
    schema: {
        model: { type: 'string', default: '/public/models/gun.glb' },
        scale: { type: 'string', default: '1.2 1.2 1.2' },
        rotation: { type: 'string', default: '0 0 0' }
    },

    init() {
        // Load gun model
        if (this.data.model) {
            this.el.setAttribute('gltf-model', this.data.model);
        }
        this.el.setAttribute('scale', this.data.scale);
        this.el.setAttribute('rotation', this.data.rotation);
        
        // Idle animation
        this.el.setAttribute('animation__idle', {
            property: 'position',
            from: '0.3 -0.3 -0.5',
            to: '0.3 -0.28 -0.5',
            dur: 2000,
            dir: 'alternate',
            easing: 'easeInOutSine',
            loop: true
        });

        this.handleShoot = this.handleShoot.bind(this);
        window.addEventListener('gun:shoot', this.handleShoot);
    },

    handleShoot() {
        // Recoil animation
        this.el.setAttribute('animation__recoil', {
            property: 'position',
            from: '0.3 -0.3 -0.5',
            to: '0.35 -0.32 -0.48',
            dur: 100,
            easing: 'easeOutQuad'
        });

        this.createMuzzleFlash();

        setTimeout(() => {
            this.el.removeAttribute('animation__recoil');
        }, 100);
    },

    createMuzzleFlash() {
        const flash = document.createElement('a-sphere');
        flash.setAttribute('position', '0 0 -0.6');
        flash.setAttribute('radius', '0.05');
        flash.setAttribute('color', '#ffff00');
        flash.setAttribute('emissive', '#ffff00');
        flash.setAttribute('opacity', '0.9');
        
        this.el.appendChild(flash);

        flash.setAttribute('animation__fade', {
            property: 'opacity',
            from: 0.9,
            to: 0,
            dur: 150,
            easing: 'easeOutQuad'
        });

        flash.setAttribute('animation__scale', {
            property: 'scale',
            from: '1 1 1',
            to: '2 2 2',
            dur: 150,
            easing: 'easeOutQuad'
        });

        setTimeout(() => {
            flash.remove();
        }, 200);
    },

    remove() {
        window.removeEventListener('gun:shoot', this.handleShoot);
    }
});

