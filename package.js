Package.describe({
    name: "jandres:snapjs-extended",
    summary: "A Library for creating beautiful mobile shelfs in Javascript (Facebook and Path style side menus)",
    version: "1.9.7",
    git: "https://github.com/JoeyAndres/legacy-drag.js.git"
});

Package.onUse(function(api) {
    api.versionsFrom("1.2.1");
    api.use([
        "ecmascript",
        "underscore",
        "jquery"
    ], 'client');

    api.addFiles([
        "snap.js",
        "snap.css"
    ]);

    api.export('Snap');
});