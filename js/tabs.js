// The About Me body, one entry per paragraph. "\n" inside an entry is a
// plain line break within that paragraph (see the "white-space: pre-line"
// rule on .tab-body p), not a new paragraph.
const ABOUT_BODY_PARAGRAPHS = [
  'FEDERICO OSATNIK',
  'Multidisciplinary Design, Creative Direction, Photography.',
  'Born in Buenos Aires, Argentina. Currently based in Rome, Italy.',
  'Bachelor’s Degree in Design — Student\nUniversidad Torcuato Di Tella',
  'Interested in the intersection of design, culture, and technology, with a focus on cultural strategy, communication, visual identity, and photography.'
];
// Not shown on the page - only used as a stable reference paragraph for the
// marquee anchor probe (see measureFrozenAnchorLeft), so the ribbon's
// position never depends on whatever the actual About Me copy above says.
const ABOUT_ANCHOR_REFERENCE_TEXT = 'Developing a multidisciplinary design practice through academic training and freelance work. Interested in the intersection of design, culture, and technology, with a focus on cultural strategy, communication, identity, and photography. Exploring how these fields can come together to create visual work that balances conceptual depth with aesthetic clarity.';
// The paragraph's left edge sits at contentOriginX (shared with Design/
// Photography - see sizeAboutBody). Its width is still what it's always
// been - from this old left edge to half the window width minus 10px - so
// moving it horizontally never re-wraps the text. Its y position is
// untouched.
const ABOUT_BODY_WIDTH_REFERENCE_LEFT_X = 344;
// Reference measure the marquee anchors against (see measureFrozenAnchor) so
// the ribbon's position stays put regardless of how wide the visible
// paragraph above it is actually sized.
const ABOUT_FIRST_LINE = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
// The skills marquee's left edge lines up with the start of this word's
// last occurrence in ABOUT_ANCHOR_REFERENCE_TEXT (see positionAboutMarquee).
const ABOUT_LIST_ANCHOR_WORD = 'with';

const ABOUT_SKILLS = [
  'Editorial',
  'Web Design',
  'Visual Identity',
  'Motion Graphics',
  'Audiovisual Design',
  'Photography',
  '3D Modeling',
  'Product Design',
  'Rendering'
];

// The drawer's two description columns (2 and 3) move as one block, placed
// so column 3's right edge lands where the Photography tab begins - see
// positionDrawerDescriptionColumns.
// Nudges just the left column (title/location/format) this many px left,
// independent of the right (description) column.
const DESIGN_DRAWER_COLUMN1_LEFT_SHIFT = 20;
// Horizontal gap between the two placeholder-text columns (2 and 3).
const DESIGN_DRAWER_COLUMN_GAP = 30;

function designPhotoLabels(count) {
  return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'));
}

// A project's real photos, in order: { src, w, h } each, w/h being the
// file's own pixel size (so every photo can reserve its exact aspect ratio
// before it loads). Projects with `images` show these in their carousel
// and open view instead of numbered placeholders; `photos` keeps one label
// per image (for indexing).
// An optional 4th value is the item's own info (see STUDIES_INFO).
function projectImages(folder, files) {
  return files.map(([name, w, h, info]) => {
    const entry = { src: encodeURI(`${folder}/${name}`), w, h };
    if (info) entry.info = info;
    return entry;
  });
}

// One project photo as an <img> - the same element for the carousel, the
// open view and its preview strip; its box (sized by its parent - see
// .project-image in CSS) never crops or distorts it. Lazy, so a carousel's
// off-screen photos only load as they come into view. Works as-is for an
// animated GIF: all motion (steps, scale, the stack's slides) is applied to
// the element around it, never to this node, which is created once and
// never re-created while it's shown - so the animation keeps looping
// uninterrupted, veiled or not.
// A video entry ({ video: true } - see projectVideos) gets a <video> instead,
// through the very same wrapper/sizing/motion - see createProjectVideo.
function createProjectImage(image, alt, options) {
  if (image.video) return createProjectVideo(image, alt, options);
  const img = document.createElement('img');
  img.className = 'project-image';
  img.src = image.src;
  img.width = image.w;
  img.height = image.h;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  return img;
}

// Same shape as projectImages, for video files: [name, width, height].
function projectVideos(folder, files) {
  return projectImages(folder, files).map(entry => ({ ...entry, video: true }));
}

// A shuffled copy (Fisher-Yates) - called once at load, never per render.
function shuffledOnce(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Mixed photos/GIFs/videos from one folder, in the given order: each file
// is a video or not by its own extension (GIFs stay <img>, animated).
const PROJECT_VIDEO_EXTENSIONS = /\.(mp4|webm|mov)$/i;
function projectMedia(folder, files) {
  return files.map(file => PROJECT_VIDEO_EXTENSIONS.test(file[0])
    ? projectVideos(folder, [file])[0]
    : projectImages(folder, [file])[0]);
}

// Plays each project video only while it's actually on screen and pauses it
// otherwise - so a closed carousel or a photo parked off-stage costs
// nothing, and no video has to be downloaded whole just because the page
// loaded (they start at preload="metadata").
const projectVideoObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const video = entry.target;
    if (entry.isIntersecting) video.play().catch(() => {});
    else video.pause();
  });
});

// One project video: always muted (attribute and property, which is what
// lets browsers autoplay it), looping, inline, no controls - never any
// sound or player UI. Like an <img>, its box never crops or distorts it
// (.project-image) and it ignores the pointer, so a click is the wrapper's
// (open the project / make it current) and never pauses or unmutes it.
// options.still: a light static frame instead of playback (the open view's
// preview strip) - only its metadata and first frame load.
function createProjectVideo(video, alt, options) {
  const el = document.createElement('video');
  el.className = 'project-image';
  el.muted = true;
  el.defaultMuted = true;
  el.setAttribute('muted', '');
  el.loop = true;
  el.playsInline = true;
  el.setAttribute('playsinline', '');
  el.controls = false;
  el.disablePictureInPicture = true;
  el.preload = 'metadata';
  el.width = video.w;
  el.height = video.h;
  el.setAttribute('aria-label', alt);
  if (options && options.still) {
    // A frame just past the start, so it shows a picture rather than black.
    el.src = video.src + '#t=0.1';
  } else {
    el.src = video.src;
    projectVideoObserver.observe(el);
  }
  return el;
}

// DISEÑO- EDITORIAL LOST BOYS: web-sized JPG copies (web/) of the original
// PNGs in the same folder - the originals are 10-22 MB each.
const LOST_BOYS_IMAGES = projectImages('images/projects/DISEÑO- EDITORIAL LOST BOYS/web', [
  ['1.jpg', 1343, 1600],
  ['2.2.jpg', 996, 1600],
  ['4.jpg', 1682, 1600],
  ['5.jpg', 2115, 1600],
  ['6.jpg', 1224, 1600],
  ['7.jpg', 2404, 1600],
  ['13.jpg', 1088, 1600],
  ['15.jpg', 2928, 1600],
  ['edit1.jpg', 1264, 1600],
  ['edit2.jpg', 1113, 1600],
  ['edit3.jpg', 1072, 1600]
]);

// diseño damasco: web-sized JPG copies (web/) of the stills first (the
// originals are up to 27 MB; web/2.jpg is the updated credits piece, 2.png),
// then the animated GIF last - always, by this explicit order, never by
// file name - used as-is (it's light, and any conversion would lose its
// animation).
const DAMASCO_PHOTOS = [
  ['web/Damasco.FLYERFINAL.jpg', 900, 1600],
  ['web/2.jpg', 2140, 1600]
];
const DAMASCO_GIF = ['gif-pruebas.gif', 1080, 1080];
const DAMASCO_IMAGES = projectImages('images/projects/diseño damasco', [...DAMASCO_PHOTOS, DAMASCO_GIF]);

// DISEÑO - BLAIR: three muted, looping videos, in this explicit order (never
// by file name); instagram.mp4 in the same folder isn't one of them.
const BLAIR_VIDEOS = projectVideos('images/projects/DISEÑO - BLAIR', [
  ['2.mp4', 1080, 1920],
  ['1.mp4', 3840, 2160],
  ['3.mp4', 3840, 2160]
]);

// diseño - house of the web: three muted, looping videos, in this explicit
// order (never by file name).
const HOUSE_OF_THE_WEB_VIDEOS = projectVideos('images/projects/diseño - house of the web', [
  ['1 (1).mp4', 1920, 1080],
  ['2 (1).mp4', 1920, 1080],
  ['3 (1).mp4', 1920, 1080]
]);

// diseño - biojuego (shown as "soma"): only its numbered photos 1-4, the
// originals as-is (a.png in the same folder isn't one of them), sorted once
// by that number (byLeadingNumber), never shuffled - the carousel's, the
// viewer's, its thumbs' and arrows' one order.
const SOMA_MEDIA = projectMedia('images/projects/diseño - biojuego', [
  ['1.png', 4962, 2716],
  ['2.png', 5940, 2481],
  ['3.png', 4245, 2716],
  ['4.png', 2774, 2716]
].sort(byLeadingNumber));

// DISEÑO - EVENTO CRUCE feeds Design's "Explorations & Other Works" gallery (see
// PERSONAL_PHOTOS_BY_PANEL) - every visual file in the folder, listed here
// by file name only to identify them: neither the grid nor the viewer ever
// follows this order - both are shuffled on every page load (see the
// "design" entry of PERSONAL_PHOTOS_BY_PANEL and buildPersonalPhotos).
// Stills are web-sized JPG copies (web/) of the originals (up to 87 MB
// each; BANNER1's has its EXIF rotation applied, as browsers show the
// original). Some copies keep the name the original had when they were made
// - the original's current name is noted next to each of those. The GIF and
// the videos (the .mov is H.264, which browsers play) are used as-is.
// An item's info (one STUDIES_INFO entry, shared by every file of the same
// work) fills its open view - year in the year line, then "**title** type"
// and the description (see drawerTextFor). Items without one show only the
// gallery's title.
const STUDIES_INFO = {
  centroOro: {
    title: 'Flyer Centro Oro',
    type: 'Freelance project',
    year: '2025',
    description: 'Flyer and illustration developed for a seminar on relationships and technology at a professional training institution for psychologists.'
  },
  cruce: {
    title: 'Flyer Cruce',
    type: 'Freelance project',
    year: '2025',
    description: 'Flyer designed for a gathering of Buenos Aires–based cultural publications, bringing together Avenir, No Divaguen, Ilka Krupkin, and Bofolio.',
    inlineLinks: [
      { text: 'Avenir', href: 'https://avenircuaderno.com/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAcGRvZgJzcnRjBmFwcF9pZA85MzY2MTk3NDMzOTI0NTkAAadZzhnQS2RkrF-f6swhwV5y0O3TZEX18PNL0U9BEYVTk62YT2XGm0ThdGiuZA_aem_WaABjp98TZ1azKLrO03b-Q' },
      { text: 'No Divaguen', href: 'https://nodivaguen.cargo.site/?utm_source=ig&utm_medium=social&utm_content=link_in_bio&fbclid=PAZXh0bgNhZW0CMTEAcGRvZgJzcnRjBmFwcF9pZA85MzY2MTk3NDMzOTI0NTkAAafVEBBnzx1NPr5UQ6yKCM8xZYrPMIVd_nv1RXWNHUYp9LDP25ZsiO_BgNgUoQ_aem_9FwkxgB-tHArc7pAq3_jAg' },
      { text: 'Ilka Krupkin', href: 'https://www.instagram.com/ilkakrupkin/' },
      { text: 'Bofolio', href: 'https://www.instagram.com/bofoliostudios/' }
    ]
  },
  sixD2: {
    title: '6D2',
    type: 'Project',
    year: '2026',
    description: 'Exhibition pieces co-designed with Agustina Corona Mercuri and Valentina Blanco for the 06 edition of MAPA Art Fair, developed around a shared manifesto.',
    inlineLinks: [
      { text: 'MAPA Art Fair', href: 'https://www.mapa.art/' },
      { text: 'manifesto', href: 'https://docs.google.com/document/d/1UiYojFi8rIkyr6swEEzr7fpw6lp01RG2l1yHXtWt7yM/edit?usp=sharing' }
    ]
  },
  archivo909: {
    title: 'Flyer Archivo 909',
    type: 'Freelance project',
    year: '2025',
    description: 'Flyer designed for an event by Archivo 909, translating the publication’s visual language into an event-specific graphic piece.',
    inlineLinks: [
      { text: 'Archivo 909', href: 'https://www.instagram.com/archivo909/' }
    ]
  },
  toto: {
    title: 'Editorial “En la salud y en la enfermedad”',
    type: 'Freelance project',
    year: '2025',
    description: 'Editorial design and production developed for fashion designer Toto Hacken as an exhibition piece accompanying the collection “En la salud y en la enfermedad.”',
    inlineLinks: [
      { text: 'Toto Hacken', href: 'https://www.instagram.com/toto_hacken/' }
    ]
  },
  noMeDesampares: {
    title: 'Exhibition Flyer “No me desampares”',
    type: 'Freelance project',
    year: '2026',
    description: 'Flyer designed for “No me desampares,” an exhibition organized by Universidad del Salvador and presented at La Botica del Ángel.',
    inlineLinks: [
      { text: 'La Botica del Ángel', href: 'https://boticadelangel.usal.edu.ar/botica/programacion' }
    ]
  },
  marianaEnriquezFanzine: {
    title: 'Mariana Enriquez Fanzine',
    type: 'Project',
    year: '2024',
    description: 'A printed fanzine built around the work of Mariana Enríquez, co-designed with Liz Bernard. Editorial design, printing, graphic design.'
  }
};
const STUDIES_MEDIA = projectMedia('images/projects/DISEÑO - EVENTO CRUCE', [
  ['web/1-png.jpg', 1080, 1920, STUDIES_INFO.cruce], // cruce1.png
  ['web/3.jpg', 1920, 2400, STUDIES_INFO.sixD2],
  ['web/4.jpg', 1920, 2400, STUDIES_INFO.sixD2],
  ['web/4.1.jpg', 2400, 1600],
  ['web/5.jpg', 1920, 2400, STUDIES_INFO.sixD2],
  ['web/5.1.jpg', 2400, 1600],
  ['web/6.jpg', 1920, 2400, STUDIES_INFO.sixD2],
  ['autoagus.mp4', 1920, 1384],
  ['web/creat.jpg', 2400, 2126],
  ['web/espalda milo.jpg', 2025, 1267],
  ['web/final1.jpg', 2366, 2398, STUDIES_INFO.archivo909],
  ['web/flyer.jpg', 1242, 1755, STUDIES_INFO.centroOro], // centro oro.jpg
  ['web/IMG_6745.jpg', 2400, 1600, STUDIES_INFO.toto], // toto1.JPG
  ['web/IMG_6752.jpg', 2400, 1600, STUDIES_INFO.toto], // toto2.JPG
  ['web/IMG_9472.jpg', 2400, 891],
  ['web/OSATNIK-SECCION2-BANNER1 (1).jpg', 2400, 857],
  ['web/OSATNIK-SECCION2-CARRUSEL2 (1).jpg', 2400, 800],
  ['web/OSATNIK-SECCION2-HISTORIA1 (1).jpg', 1080, 1920],
  ['web/prueba1.jpg', 2400, 1800],
  ['RPReplay_Final1717376467.mov', 828, 828],
  ['web/si2.jpg', 2025, 2400, STUDIES_INFO.cruce], // cruce 2.jpg
  ['sisisi.mp4', 1920, 1080],
  ['sumado.gif', 3729, 2617],
  ['web/30.09 posteo.jpg', 1157, 1071, STUDIES_INFO.noMeDesampares]
]).concat(
  // diseño - fanzine_Ecos de los oscuro (the Mariana Enriquez fanzine, no
  // longer one of Design's projects): its one muted, looping video, from its
  // own folder, shuffled in with the rest.
  projectMedia('images/projects/diseño - fanzine_Ecos de los oscuro', [
    ['Untitled-1.mp4', 1400, 1000, STUDIES_INFO.marianaEnriquezFanzine]
  ])
);

// Natural numeric order by a file name's leading number (1, 2, ... 9, 10,
// 11 - never the alphabetical 1, 10, 11, 2), whatever its type/extension.
function byLeadingNumber(a, b) {
  const num = file => parseInt(file[0].split('/').pop(), 10);
  return num(a) - num(b) || a[0].localeCompare(b[0], undefined, { numeric: true });
}

// diseño - atefacto: every file in its incluir/ subfolder - the project's only
// source (nothing else in the parent folder is used), stills and muted,
// looping videos, used as-is. Its file names are numbered in the order they
// show in: sorted once by that number (byLeadingNumber), never shuffled -
// that one array is the carousel's, the viewer's, its thumbs' and arrows'
// order. Sizes are the displayed ones: 4.jpg is stored sideways with an EXIF
// rotation (7.jpg upside down), which browsers apply.
const ARTEFACTO_MEDIA = projectMedia('images/projects/diseño - atefacto/incluir', [
  ['1.png', 2666, 2239],
  ['2.mp4', 1224, 1080],
  ['3.mp4', 1224, 1080],
  ['4.jpg', 3508, 2480],
  ['5.mp4', 1050, 1080],
  ['6.mp4', 1224, 1080],
  ['7.jpg', 3508, 4961],
  ['8.mp4', 3638, 4960]
].sort(byLeadingNumber));

// Real titles/years/tags as given. photos/location/format/description are
// still placeholders (not supplied) - swap them in as the real copy/photo
// counts are ready. Each project supplies its own drawer text
// (location/format/description) rather than sharing one global placeholder,
// so every project reads as distinct when opened.
const DESIGN_PROJECTS = [
  {
    title: 'artefacto',
    year: '2023',
    tags: ['Identity Design', 'Editorial Design'],
    photos: designPhotoLabels(ARTEFACTO_MEDIA.length),
    images: ARTEFACTO_MEDIA,
    location: 'Buenos Aires, Argentina',
    format: 'Identity Design',
    description: 'Artefacto is a visual identity developed for a venue dedicated to photography and its dissemination. Drawing from the visual language and material culture of analog photography, the identity extends across editorial pieces, catalogs, programs, posters, and promotional materials. The project seeks to establish a coherent visual system for a space conceived to foster photographic culture and promote both national and international practices.'
  },
  {
    title: 'The House of the Web',
    // Shown on the title's line in the open view, right-aligned to the
    // description (see alignDrawerCredit).
    credit: '(co-designed with Sara Perez Cotter & Romeo Labrador Keiner)',
    year: '2025',
    tags: ['Audiovisual Design', 'Interactive Game', 'UX Design'],
    photos: designPhotoLabels(HOUSE_OF_THE_WEB_VIDEOS.length),
    images: HOUSE_OF_THE_WEB_VIDEOS,
    location: 'Buenos Aires, Argentina',
    format: 'Interactive Game',
    description: 'The House of the Web is an interactive digital experience that explores contemporary visual culture through questions of image consumption, circulation, accumulation, and archiving. Grounded in theoretical references, the project translates these issues into a navigable audiovisual environment. Hosted on YouTube, it repurposes the platform’s timeline as an interface: keyboard inputs allow users to move between different rooms and construct their own path through the experience.',
    // Words of the description that link out, inline (see flowDrawerDescription).
    inlineLinks: [
      { text: 'The House of the Web', href: 'https://www.youtube.com/watch?v=mwm9NAwUJaM&t=322s' }
    ]
  },
  {
    title: 'editorial "lost boys"',
    year: '2025',
    tags: ['Analog Editing and Intervention of Photographs by Lucia Schuchner'],
    photos: designPhotoLabels(LOST_BOYS_IMAGES.length),
    images: LOST_BOYS_IMAGES,
    location: 'Rome, Italy',
    format: 'Editorial Design',
    description: 'The Lost Boys is a photographic editorial featuring the work of Lucía Schuchner, developed through color grading and physical intervention. The project explores youth, collective identity, fantasy, and belonging through a visual language in which contemporary gestures encounter imagined characters and unexpected codes. Analog processes become part of the narrative, emphasizing materiality, experimentation, and the tension between fleeting moments and shared experience.',
    inlineLinks: [
      { text: 'Lucía Schuchner', href: 'https://www.instagram.com/lucila.schuchner/' }
    ]
  },
  {
    title: 'Construction game - soma',
    // The open view's title, instead of `title` (see openDesignPhotoDrawer).
    openTitle: 'soma',
    year: '2025',
    tags: ['Product Design', 'Packaging Design', 'User Manual Design'],
    photos: designPhotoLabels(SOMA_MEDIA.length),
    images: SOMA_MEDIA,
    location: 'Rome, Italy',
    format: 'Product Design',
    description: 'Soma is a modular construction game inspired by the movement and articulation of the human body. Designed for production through 3D printing and laser-cut MDF, the system combines easily assembled components with two intuitive joint mechanisms that allow pieces to connect, rotate, and be repositioned. These connections enable multidirectional growth, encouraging open-ended structures through continuous construction and manipulation.'
  },
  {
    title: '(des) archivados - blair',
    year: '2026',
    tags: ['Graphic and Typography Design for Archival Audiovisual Work by 909'],
    photos: designPhotoLabels(BLAIR_VIDEOS.length),
    images: BLAIR_VIDEOS,
    location: 'Buenos Aires, Argentina',
    format: 'Graphic & Typography Design',
    description: '(des)archivados — Blair is an audiovisual piece produced by Archivo 909 that follows a day in the life of singer-songwriter Blair. The graphic and typographic system was developed in dialogue with the magazine’s existing visual identity, characterized by an archival approach, editorial typography, raw image treatments, and the visible layering of information. These elements are translated into motion to frame the artist through the publication’s distinctive documentary language.',
    inlineLinks: [
      { text: '(des)archivados — Blair', href: 'https://www.youtube.com/watch?v=7fHNgfhrlbA' },
      { text: 'Archivo 909', href: 'https://www.instagram.com/archivo909/' }
    ]
  },
  {
    title: 'Damasco',
    year: '2025',
    tags: ['Graphic Design', 'Typography Design for Fashion Film'],
    photos: designPhotoLabels(DAMASCO_IMAGES.length),
    images: DAMASCO_IMAGES,
    location: 'Buenos Aires, Argentina',
    // The open view's year/location line, verbatim (instead of "{year}. {location}").
    locationLine: 'Buenos Aires, 2025',
    format: 'Typography Design',
    description: 'Damasco is a fashion film directed by Agustín García and produced by Clara Marcus. The graphic design and custom calligraphic title were developed to complement the film’s visual universe, translating its dreamlike atmosphere into a delicate yet distinctive graphic language. The resulting identity balances elegance and classical references with the film’s more ethereal and expressive qualities.',
    inlineLinks: [
      { text: 'Damasco', href: 'https://drive.google.com/file/d/1mWjv6EovaueIir0AHwEHd6OdfVqOFD8l/view?usp=sharing' }
    ]
  }
];

// Photography's content: each folder is one project, its files listed here
// by name only to identify them. The order a project shows them in is
// never this one: every list is shuffled once per page load (shuffledOnce),
// and that one shuffled array is the project's single source of truth for
// the whole visit - its carousel, the viewer, its thumbs and arrows all
// read it, so they always agree. Stills are web-sized JPG copies (web/) of
// the originals (up to 32 MB each), EXIF rotation applied.
// "untitled": the untilted folder.
const UNTITLED_IMAGES = projectMedia('images/projects/untilted', [
  ['web/Copia de Copia de 0887 (7).jpg', 2400, 1591],
  ['web/Copia de Copia de 2434 (35).jpg', 2400, 1591],
  ['web/Copia de Copia de 30965184_Unknown.jpg', 2048, 1368],
  ['web/Copia de Copia de DSC08479.jpg', 2400, 1800],
  ['web/Copia de Copia de P1100301.jpg', 2400, 1800],
  ['web/Copia de Copia de P1100601.jpg', 2400, 1800],
  ['web/Copia de Copia de P1110354.jpg', 2400, 1800],
  ['web/Copia de IMG_7397.jpg', 2400, 1600],
  ['web/Copia de IMG_7398.jpg', 2400, 1600],
  ['web/Copia de IMG_7401.jpg', 2400, 1600],
  ['web/Copia de IMG_8194.jpg', 2400, 1600],
  ['web/Copia de IMG_8233.jpg', 2400, 1600],
  ['web/Copia de IMG_8263.jpg', 2400, 1600],
  ['web/Copia de IMG_96122.jpg', 2400, 1600],
  ['web/Copia de P1100673.jpg', 2400, 1800],
  ['web/Copia de P1100844.jpg', 2400, 1800],
  ['web/Copia de P1100928.jpg', 2400, 1800]
]);

// "diary": the diario folder.
const DIARY_IMAGES = projectMedia('images/projects/diario', [
  ['web/Copia de Copia de 11.jpg', 2400, 1958],
  ['web/Copia de Copia de 2435 (14).jpg', 2400, 1591],
  ['web/Copia de Copia de 2435 (15).jpg', 2400, 1591],
  ['web/Copia de Copia de 2435 (8).jpg', 2400, 1591],
  ['web/Copia de Copia de P1100133.jpg', 2400, 1800],
  ['web/Copia de Copia de P1100853.jpg', 2400, 1800],
  ['web/Copia de Copia de P1120463.jpg', 2400, 1800],
  ['web/Copia de IMG_2458.jpg', 2048, 1368],
  ['web/Copia de P1100568.jpg', 2400, 1800],
  ['web/Copia de P1100669.jpg', 2400, 1800],
  ['web/Copia de P1120923.jpg', 2400, 1800],
  ['web/Copia de P1130444.jpg', 2400, 1800]
]);

const ARCHIVE_IMAGES = projectMedia('images/projects/joven ambulante citadino', [
  ['web/Copia de Copia de 1869 (15).jpg', 2400, 1591],
  ['web/Copia de Copia de 2435 (17).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de 0887 (13).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de 0887 (14) (2).jpg', 2400, 1840],
  ['web/Copia de Copia de Copia de 0887 (8).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de 1631 (21).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de 1631 (30).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de 1631 (32).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de 2434 (32).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de Copia de 1629 (11).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de Copia de 1629 (8).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de Copia de 1630 (30).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de Copia de 1631 (13).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de Copia de 1631 (22).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de Copia de 1631 (23).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de Copia de Copia de 1629 (28).jpg', 2400, 1591],
  ['web/Copia de Copia de Copia de P1100676.jpg', 2400, 1800],
  ['web/Copia de Copia de Copia de P1120371.jpg', 2400, 1800],
  ['web/Copia de Copia de DSC08597.jpg', 2400, 1404],
  ['web/Copia de Copia de DSC08901.jpg', 2400, 1840],
  ['web/Copia de Copia de IMG_9387.jpg', 2400, 1772],
  ['web/Copia de Copia de IMG_95832.jpg', 2400, 1600],
  ['web/Copia de Copia de P1090664.jpg', 2400, 1800],
  ['web/Copia de Copia de P1100847.jpg', 2400, 1800],
  ['web/Copia de Copia de P1100946.jpg', 1800, 2400],
  ['web/Copia de Copia de P1110182.jpg', 2400, 1800],
  ['web/Copia de Copia de P1110465.jpg', 2400, 1800],
  ['web/Copia de Copia de P1110473.jpg', 2400, 1800],
  ['web/Copia de Copia de P1110490.jpg', 2400, 1800],
  ['web/Copia de Copia de P1110755.jpg', 2400, 1800],
  ['web/Copia de Copia de P1110950.jpg', 2400, 1800],
  ['web/Copia de Copia de P1120036.jpg', 2400, 1800],
  ['web/Copia de Copia de P1120198.jpg', 2400, 1800],
  ['web/Copia de Copia de P1120211.jpg', 2400, 1800],
  ['web/Copia de Copia de P1120227.jpg', 2400, 1800],
  ['web/Copia de Copia de P1120333.jpg', 2400, 1800],
  ['web/Copia de Copia de P1120805.jpg', 2400, 1800],
  ['web/Copia de P1120877.jpg', 2400, 1800],
  ['web/Copia de P1130460.jpg', 2400, 1800],
  ['web/Copia de P1130502.jpg', 2400, 1800]
]);

// A project from a folder's media: its order shuffled once, here, at load.
function folderProject(title, media) {
  const images = shuffledOnce(media);
  return { title, year: '', photos: designPhotoLabels(images.length), images };
}

// Photography tab's own project blocks - same shape as DESIGN_PROJECTS, but
// its own independent set of projects (see PROJECTS_BY_PANEL). The
// projects' own order is fixed; only the photos inside each are shuffled.
// No year/tags/text yet - Photography's blocks show only name and year.
const PHOTOGRAPHY_PROJECTS = [
  folderProject('untitled', UNTITLED_IMAGES),
  folderProject('diary', DIARY_IMAGES)
];

// "Freelance projects" in Explorations & Other Works: an item whose own
// info (STUDIES_INFO - type or title) names a freelance project, a project
// or 6D2. Everything else is an exploration - the exact complement.
const FREELANCE_PATTERN = /freelance projects?|projects?|6d2/i;
function isFreelanceItem(item) {
  const info = item && item.info;
  return !!info && [info.type, info.title].some(text => FREELANCE_PATTERN.test(text || ''));
}

// Loose photos shown as a grid below a panel's own projects (see
// buildPersonalPhotos) - not a project, no carousel. Opening one reuses the
// exact same viewer/drawer as the projects (openDesignPhotoDrawer), with this
// object standing in as the "project", so the arrows only ever walk through
// this collection's own photos. Add more labels to `photos` and they simply
// continue in the grid.
const PERSONAL_PHOTOS_BY_PANEL = {
  // Design's equivalent, after its last project: STUDIES_MEDIA's photos,
  // GIFs and videos. Like every gallery, which item sits in which cell and
  // which cells stay empty are both re-drawn on every page load (see
  // buildPersonalPhotos). The viewer's order is random too: this list is
  // shuffled once per load (never by file name), so the arrows - and the
  // title's click, which opens at its first item - follow a new order on
  // every visit, stable within it.
  design: {
    title: 'Explorations & Other Works',
    photos: designPhotoLabels(STUDIES_MEDIA.length),
    images: shuffledOnce(STUDIES_MEDIA),
    // Its title looks and acts like a Design project's (see buildPersonalPhotos).
    projectHeader: true,
    // The open view's year/description follow the current item's own info
    // (STUDIES_INFO), not this collection's - see drawerTextFor.
    itemInfo: true,
    // The filter row under its title (see buildPersonalPhotos): the first
    // is the one selected on every load.
    filters: [
      // Its orange mark reaches left to the Contact tab's left edge.
      { label: 'All', test: () => true, markFromContact: true },
      { label: 'Freelance Projects', test: isFreelanceItem },
      { label: 'Explorations', test: item => !isFreelanceItem(item) }
    ]
  },
  // Photography's equivalent of studies - the same project-style section,
  // fed from its own folder, its order shuffled once per load.
  photography: {
    title: 'Archive',
    photos: designPhotoLabels(ARCHIVE_IMAGES.length),
    images: shuffledOnce(ARCHIVE_IMAGES),
    projectHeader: true
  }
};

// Essays tab's own project blocks - same shape and mechanics as
// DESIGN_PROJECTS/PHOTOGRAPHY_PROJECTS, its own independent set of entries.
// Essays tab's own entries - a different shape from DESIGN_PROJECTS/
// PHOTOGRAPHY_PROJECTS above: "summary" is the short paragraph shown on the
// closed white card (replaces tags), "body" is the full essay text (one
// entry per paragraph) revealed on expand - see buildEssayCards. Real body
// copy isn't in yet - these three paragraphs per essay are placeholders.
const ESSAYS_PROJECTS = [
  {
    title: 'On Repetition',
    year: '2024',
    summary: 'A short essay on repetition as a design tool, tracing the same motif across furniture, type and signage.',
    body: [
      'Repetition rarely gets credit as a design decision on its own - it\'s usually treated as a byproduct of production, a side effect of manufacturing something more than once. Looked at directly, repeating a form, a module, or a mark is one of the most deliberate choices a designer can make.',
      'This piece traces the same motif across three very different contexts: a joinery detail repeated across a shelving system, a single glyph repeated until it becomes a texture, and a signage unit repeated down a corridor until it reads as rhythm rather than instruction.',
      'In each case the repetition does two things at once: it lowers the cost of producing the thing, and it raises the reader\'s confidence that the system holds together. The essay argues these are the same effect, seen from two different sides of the process.'
    ]
  },
  {
    title: 'Notes on Craft',
    year: '2023',
    summary: 'Notes gathered while apprenticing with a ceramicist, on the difference between making by hand and making by eye.',
    body: [
      'For six months I spent one afternoon a week in a ceramics studio, mostly getting in the way. What follows are notes taken during that time, not a finished argument - closer to a working diary than an essay.',
      'The clearest thing I took from it: making by hand and making by eye are not the same skill, and design training mostly teaches the second. A thrown bowl corrects itself under your fingers in ways a rendered one never has to.',
      'The notes end without a conclusion, on purpose. The apprenticeship is still going, on and off, and the more interesting question - what a screen-based practice loses by skipping the hand entirely - is one I\'m still working through.'
    ]
  },
  {
    title: 'The Grid and the Hand',
    year: '2022',
    summary: 'An essay on where systematic grids give way to intuition, drawn from a year of editorial layout work.',
    body: [
      'Every layout system starts as a grid and ends as a series of exceptions to it. This essay looks at a year of editorial work to ask where, specifically, that handoff happens - the moment a rule stops deciding the page and a hand starts deciding it instead.',
      'Three spreads are examined closely: one that follows the grid without deviation, one that breaks it once, deliberately, and one where the grid is abandoned entirely for a double-page image. Each is treated as evidence rather than as a failure or a success.',
      'The conclusion, such as it is: a grid\'s value isn\'t in how strictly it\'s followed, but in how legible the departures from it become. A system you can\'t see yourself leaving isn\'t disciplined - it\'s just invisible.'
    ]
  }
];

// Which project data set builds into which tab - buildPanels calls
// buildDesignProjects(el, panel.id) for every panel id listed here, each
// getting its own independent container/carousels/portals (see
// projectsElByPanel, designCarouselPortals) even though they share the exact
// same mechanics and screen position. Essays is deliberately NOT listed here
// any more - it has its own, unrelated buildEssayCards(el) (see below),
// with no carousel, no portal, no photo drawer.
const PROJECTS_BY_PANEL = {
  design: DESIGN_PROJECTS,
  photography: PHOTOGRAPHY_PROJECTS
};

// Essays removed from the tab bar per request - buildEssayCards/
// ESSAYS_PROJECTS still exist below, unused, in case it comes back later.
const PANELS = [
  { id: 'about', title: 'ABOUT_ME', body: ABOUT_BODY_PARAGRAPHS, list: ABOUT_SKILLS },
  { id: 'design', title: 'DESIGNS' },
  { id: 'photography', title: 'PHOTOGRAPHY' }
];

// Every tab's whole color identity - one single source of truth. Each
// tab has exactly one fixed color for its own .tab-color-block (rect) and
// one fixed color for its own title (and so its dotted underline), in every
// state (vertical, horizontal, mid-animation, hover) - see buildPanels,
// which reads this once per panel at build time. Contact has no entry: its
// title keeps the shared base --tab-title-color (style.css).
const TAB_ACCENT_COLORS = {
  about: { rect: '#D9C1BF', title: '#4868B1' },
  design: { rect: '#CECCE7', title: '#707745' },
  photography: { rect: '#D2E6B0', title: '#AD4A3A' }
};

// The phone-only screen (.mobile-notice, style.css): one tab's pair drawn at
// random once per load - its rect as the background, its own title color as
// the text - set on the root so it holds for the whole visit.
(function pickMobileNoticeColors() {
  const pairs = Object.values(TAB_ACCENT_COLORS);
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  document.documentElement.style.setProperty('--mobile-notice-bg', pair.rect);
  document.documentElement.style.setProperty('--mobile-notice-color', pair.title);
})();

function cubicBezier(x1, y1, x2, y2) {
  function bezierCoord(t, p1, p2) {
    const u = 1 - t;
    return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
  }
  return function easeAtTime(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let lo = 0, hi = 1, mid = t;
    for (let i = 0; i < 20; i++) {
      mid = (lo + hi) / 2;
      const x = bezierCoord(mid, x1, x2);
      if (x < t) lo = mid; else hi = mid;
    }
    return bezierCoord(mid, y1, y2);
  };
}

function readDurationMs(varName, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (raw.endsWith('ms')) return parseFloat(raw);
  if (raw.endsWith('s')) return parseFloat(raw) * 1000;
  return fallback;
}

const LINEAR_EASE = t => Math.min(1, Math.max(0, t));

function readEase(varName, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (raw === 'linear') return LINEAR_EASE;
  const match = raw.match(/cubic-bezier\(([^)]+)\)/);
  if (!match) return fallback;
  const p = match[1].split(',').map(s => parseFloat(s.trim()));
  if (p.length !== 4 || p.some(isNaN)) return fallback;
  return cubicBezier(p[0], p[1], p[2], p[3]);
}

function readPx(varName, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const v = parseFloat(raw);
  return isNaN(v) ? fallback : v;
}

// Read from CSS custom properties so timing/spacing stay defined in one place (style.css)
const TABS_DURATION_MS = readDurationMs('--tabs-transition-duration', 750);
const TABS_EASE = readEase('--tabs-transition-ease', LINEAR_EASE);

// Keep both in sync with .design-carousel-thumb/.is-current in style.css -
// the thumb's own fixed width and how much the current one scales to. Used
// below to quantize the grow/shrink into --tabs-grid-step-sized jumps, the
// same "rasterized" motion language as the tab-panel slide, marquee and
// photo drawer/viewer. One size for every panel's carousel (Design and
// Photography share the exact same layout).
const CAROUSEL_THUMB_SIZE = 96;
const CAROUSEL_THUMB_HOVER_SCALE = 2.25;
// Gap between photos: --project-media-gap in style.css, the one value the
// carousels and the galleries' grid streets all share.
const CAROUSEL_GAP = readPx('--project-media-gap', 35);
function carouselThumbHoverSteps(thumbSize) {
  return Math.max(1, Math.round(
    thumbSize * (CAROUSEL_THUMB_HOVER_SCALE - 1) / readPx('--tabs-grid-step', 22)
  ));
}
// How long a prev/next carousel step takes to animate - a plain,
// self-contained number (not tied to the tab-panel slide's own duration)
// since it's a much shorter, snappier motion.
const CAROUSEL_NAV_STEP_DURATION_MS = 300;
// Symbol and label of each kind of nav control (createNavControl) - the
// carousels' arrows and the open project's arrows/close.
const NAV_CONTROL_TYPES = {
  prev: { symbol: '‹', label: 'Previous photo' },
  next: { symbol: '›', label: 'Next photo' },
  close: { symbol: '×', label: 'Close project' }
};

// Snapping to the same grid the glyphs move on (script.js GRID_STEP) gives the
// slide a visibly stepped feel without looking stuck - kept fine enough to stay smooth.
function snapToTabsGrid(v) {
  const step = readPx('--tabs-grid-step', 22);
  return Math.round(v / step) * step;
}

const tabsContainer = document.getElementById('tabsContainer');
// -1 is the "landing" sentinel - nothing opened yet, every tab shown closed
// (see computeTargets) - until the first real selectPanel() call, whether
// via the landing background (About, see reveal()) or a direct click on a
// specific closed tab, sets it to a real panel index.
let activeIndex = -1;
// Which panel opens once the OSATNIK glyph finishes forming
// (portfolio:introComplete, see reveal()) - defaults to About (the landing
// background's own click path), overridden to whichever tab was clicked
// directly while still on the landing (see the panel click handler in
// buildPanels), so both entry points share the same "glyph forms, then the
// chosen tab opens" beat.
let pendingLandingOpenIndex = 0;
let panelEls = [];
// One .tab-color-block per panel, same order as panelEls/PANELS - see
// buildPanels. Only its width ever needs recomputing after creation (on
// resize, since it's derived from --glyph-cell-size - see
// positionTabColorBlocks), never its color or position.
const tabColorBlockEls = [];
let animFrame = null;
// Whatever {left, width, z} array every panel is CURRENTLY animating toward
// (or has already settled into) - set by applyTargets/animateToTargets,
// whichever last ran. positionDesignProjects reads each panel's own left
// from here instead of independently recomputing computeTargets() itself,
// so a project's frozen container tracks its real destination for ANY
// transition - including slideTabsOut's full close, which animates every
// panel back to computeTargets()'s own activeIndex<0 landing layout, not
// whatever its normal (some tab active) resting spot would be. Recomputing
// computeTargets() unconditionally would keep assuming that normal
// destination even while a panel is actually closing back to the landing,
// so the frozen carousel would stay glued to its ordinary covered-left spot
// instead of sliding away with it.
let currentPanelTargets = null;
// True while any panel-slide transition (open/close/switch) is in flight.
// Gates the Designs project hover effect, since hovering mid-slide measured
// stale/moving rects and could leave the highlight stuck on.
let panelsAnimating = false;

// Each title letter is a fixed --glyph-cell-size-wide slot (see buildPanels),
// so the title's true rendered width is just charCount * that cell size.
function measureTitleWidth(panelEl) {
  const titleEl = panelEl.querySelector('.tab-title');
  const cellSize = readPx('--glyph-cell-size', 20);
  const sidePadding = readPx('--tab-side-padding', 10) * 2;
  return Math.ceil(titleEl.textContent.length * cellSize + sidePadding);
}

// Re-measures every tab's own fixed-width color block (see buildPanels) -
// only ever needed on resize, since --glyph-cell-size is itself resize-
// driven and this width is otherwise permanent (never touched by
// open/close/hover - see selectPanel).
function positionTabColorBlocks() {
  panelEls.forEach((el, i) => {
    const block = tabColorBlockEls[i];
    if (!block) return;
    const width = measureTitleWidth(el);
    block.style.width = width + 'px';
    // Reaches all the way to the bottom of this tab's own scrollable
    // content (design/photography scroll vertically past one viewport's
    // worth - see the panel's own overflow-y:auto), not just a single
    // viewport tall - otherwise, being an ordinary descendant that scrolls
    // together with the rest of the panel's content, it would scroll
    // completely out of view above the visible area partway down instead of
    // staying right there under whatever's currently in view. clientHeight
    // alone covers About (never scrolls, no extra content below one
    // viewport).
    block.style.height = Math.max(el.clientHeight, el.scrollHeight) + 'px';
    // No background is painted on .tab-header any more (it's transparent -
    // see the sticky .tab-header rule in style.css), so this block shows
    // through it directly, with nothing covering the content above it.
  });
}

// Strip on the left, same color as the pre-interaction background. Clicking it
// resets back to the landing page, same as clicking the OSATNIK glyph block.
const tabsHome = document.createElement('div');
tabsHome.id = 'tabsHome';
tabsHome.className = 'tabs-home';
tabsContainer.appendChild(tabsHome);

// Invisible hotspot over the collapsed OSATNIK glyph block. Only clickable once
// the intro has revealed the tabs; clicking it resets back to the landing page.
const osatnikHotspot = document.createElement('div');
osatnikHotspot.id = 'osatnikHotspot';
osatnikHotspot.className = 'osatnik-hotspot';
tabsContainer.appendChild(osatnikHotspot);

// Base z-index for the (hidden) rect-morph layer on <body>. The photo
// drawer/viewer/backdrop (the open-project view) sit on <body> too, at
// 1002-1004 - above the whole of tabsContainer (its own stacking context at
// z1), Contact included.
const DESIGN_ABOVE_CANVAS_Z = 1001;

// Full-width highlight bar for hovering a project. Part of the normal
// project list, so it lives inside tabsContainer: above every tab and its
// projects (so it spans the full screen width over them), below Contact -
// see the layer list above panelLayerZ. Fixed-positioned in viewport
// coordinates (tabsContainer has no transform, so that still holds inside it).
// The bar covers the hovered project's title/year too - to keep those
// visible on top, live clones ("ghosts") of just those two elements are
// stamped at their exact screen position one layer higher, for as long as
// the bar is shown.
const DESIGN_HOVER_BAR_Z = 9;
const DESIGN_HOVER_GHOST_Z = 10;

const designHoverBar = document.createElement('div');
designHoverBar.className = 'design-hover-bar';
designHoverBar.style.zIndex = DESIGN_HOVER_BAR_Z;
tabsContainer.appendChild(designHoverBar);

// The bar (and its ghosts) are purely visual - pointer-events:none in CSS -
// so they never take a click meant for the title, a photo or an arrow
// underneath, and clicking the empty width of the title row opens nothing.
let designHoverGhosts = [];

function mountDesignHoverGhost(sourceEl) {
  const rect = sourceEl.getBoundingClientRect();
  const ghost = sourceEl.cloneNode(true);
  ghost.classList.add('design-hover-ghost');
  ghost.style.position = 'fixed';
  ghost.style.left = Math.round(rect.left) + 'px';
  ghost.style.top = Math.round(rect.top) + 'px';
  ghost.style.margin = '0';
  ghost.style.zIndex = DESIGN_HOVER_GHOST_Z;
  // Ghosts live outside the panel's color context (color: inherit would
  // otherwise pick up whatever tabsContainer's ancestry resolves to), so
  // copy the real computed color across explicitly.
  ghost.style.color = getComputedStyle(sourceEl).color;
  // Same layer group as designHoverBar (inside tabsContainer, below Contact).
  tabsContainer.appendChild(ghost);
  return ghost;
}

// The title's own line box (rect.height) includes the font's normal leading
// above/below the glyphs. A Range over the actual text reports the real
// rendered glyph extent (same technique used for the marquee's word
// anchoring), which hugs the text far more closely than the element's box.
// Works whether el's content is a plain text node or (like the title, now
// split into per-letter grid-char spans) a run of single-character children.
function measureTextInkRect(el) {
  const rect = el.getBoundingClientRect();
  const firstTextNode = node => (node && node.nodeType !== Node.TEXT_NODE) ? firstTextNode(node.firstChild) : node;
  const lastTextNode = node => (node && node.nodeType !== Node.TEXT_NODE) ? lastTextNode(node.lastChild) : node;
  const startNode = firstTextNode(el.firstChild);
  const endNode = lastTextNode(el.lastChild);
  if (!startNode || !endNode) return rect;
  const range = document.createRange();
  range.setStart(startNode, 0);
  range.setEnd(endNode, endNode.length);
  const rangeRect = range.getBoundingClientRect();
  if (!rangeRect.height) return rect;
  return rangeRect;
}

// titleEl/yearEl stay fully visible (via ghost clones) while the rest of the
// hovered project - and the whole rest of the panel - sits under the bar.
// Distance the bar's top/bottom edges sit inset from the title's measured
// ink box (tuned independently - the bar isn't symmetric around the text).
const DESIGN_HOVER_BAR_TOP_INSET = 9;
const DESIGN_HOVER_BAR_BOTTOM_INSET = 2;

function showDesignHoverBar(titleEl, yearEl) {
  const ink = measureTextInkRect(titleEl);
  const top = ink.top + DESIGN_HOVER_BAR_TOP_INSET;
  const bottom = ink.top + ink.height - DESIGN_HOVER_BAR_BOTTOM_INSET;
  designHoverBar.style.top = Math.round(top) + 'px';
  designHoverBar.style.height = Math.round(bottom - top) + 'px';
  designHoverBar.classList.add('is-visible');

  designHoverGhosts.forEach(g => g.remove());
  // yearEl is optional (a project-style gallery title has none).
  designHoverGhosts = [titleEl, yearEl].filter(Boolean).map(mountDesignHoverGhost);
}

function hideDesignHoverBar() {
  designHoverBar.classList.remove('is-visible');
  designHoverGhosts.forEach(g => g.remove());
  designHoverGhosts = [];
}

let aboutBodyP = null;
let aboutBodyParagraphEls = [];
let aboutBodyDivEl = null;
let aboutMarqueeEl = null;
let aboutMarqueeClipEl = null;
let aboutMarqueeTrackEl = null;
// One project-blocks container per panel that has them (design, photography,
// essays) - keyed by panel id. Each is positioned independently in
// positionDesignProjects() but against the exact same fixed on-screen box, so
// whichever of the three is open lands in the same spot the others do.
const projectsElByPanel = {};
// {panelId, anchor, portal, ...} per project across every project-bearing
// panel - see buildDesignProjects/positionDesignCarousels.
const designCarouselPortals = [];
// One array of .design-project-rect elements per panel (design, photography),
// in the same order as PROJECTS_BY_PANEL[panelId] - the "leaf" rectangles the
// About ribbon (.tab-marquee) splits into/merges back from - see
// getPanelRectSlots/beginRectMorph below.
const projectRectElsByPanel = {};
// Per project panel: the invisible in-panel spacer that gives the panel its
// scroll height now that its content lives in a separate layer, and that
// content's own top at scroll 0 (see positionDesignProjects/
// applyProjectsScroll).
const scrollSpacerByPanel = {};
const projectsBaseTopByPanel = {};

// Rides the content layer along with its panel's vertical scroll.
function applyProjectsScroll(panelId) {
  const projectsEl = projectsElByPanel[panelId];
  const panel = panelEls[PANELS.findIndex(p => p.id === panelId)];
  if (!projectsEl || !panel || projectsBaseTopByPanel[panelId] == null) return;
  projectsEl.style.top = Math.round(projectsBaseTopByPanel[panelId] - panel.scrollTop) + 'px';
}

// Builds one tab's project blocks - each one a title/year row, tag labels,
// and a horizontal photo carousel - and appends them to panelEl. panelId
// selects which independent data set (PROJECTS_BY_PANEL) this panel gets.
// Positioned in positionDesignProjects() to match the About Me text's own box
// exactly, since this is meant to sit in the same place for every panel that
// has one.
function buildDesignProjects(panelEl, panelId) {
  // This tab's content layer: one element, a sibling of the panels inside
  // tabsContainer (not a descendant of its own panel), at
  // panelContentLayerZ - so it's never clipped to the tab's rectangle, sits
  // above its own tab's surface, and is covered only by a later tab. Inside
  // it, DOM order is paint order: the project column first, then every
  // carousel's photo row, then every carousel's prev/next arrows - so no
  // project block or photo can ever sit over an arrow.
  const panelIndex = PANELS.findIndex(p => p.id === panelId);
  const layer = document.createElement('div');
  layer.className = 'panel-content-layer';
  layer.style.zIndex = panelContentLayerZ(panelIndex);
  const container = document.createElement('div');
  container.className = 'design-projects';
  layer.appendChild(container);
  const navs = [];
  const rectEls = [];
  const palette = TAB_ACCENT_COLORS[panelId];

  PROJECTS_BY_PANEL[panelId].forEach(project => {
    const block = document.createElement('div');
    block.className = 'design-project';

    const header = document.createElement('div');
    header.className = 'design-project-header';
    const title = document.createElement('span');
    title.className = 'design-project-title';
    // Same per-letter grid-char treatment as the year, so both share the
    // same letter-spacing rhythm instead of the title running its letters
    // together while the year's are spaced out.
    project.title.split('').forEach(ch => {
      const charEl = document.createElement('span');
      charEl.className = 'tab-title-char grid-char';
      charEl.textContent = ch;
      title.appendChild(charEl);
    });
    const year = document.createElement('span');
    year.className = 'design-project-year';
    // Same per-letter grid-char treatment as the tab titles, so the year is
    // spaced out identically (each letter centered in a fixed --glyph-cell-size
    // cell) instead of rendering as ordinary run-together text.
    project.year.split('').forEach(ch => {
      const charEl = document.createElement('span');
      charEl.className = 'tab-title-char grid-char';
      charEl.textContent = ch;
      year.appendChild(charEl);
    });
    header.appendChild(title);
    header.appendChild(year);

    // Photography's own blocks show only the name and date - no tags row.
    const showTags = panelId !== 'photography';
    let tags = null;
    if (showTags) {
      tags = document.createElement('div');
      tags.className = 'design-project-tags';
      project.tags.forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.textContent = tag;
        tags.appendChild(tagEl);
      });
    }

    // In-flow, invisible - just reserves/marks the spot (via the normal
    // title/tags/margin-top flex flow) that the real carousel below visually
    // starts at, since that real one lives outside this block entirely.
    const carouselAnchor = document.createElement('div');
    carouselAnchor.className = 'design-carousel-anchor';

    // The real, interactive carousel is a portal in this tab's content layer
    // (not inside the block), so it can span the whole screen width instead
    // of the column's. See positionDesignCarousels.
    const carouselPortal = document.createElement('div');
    carouselPortal.className = 'design-carousel-portal';
    const thumbSize = CAROUSEL_THUMB_SIZE;
    const carousel = document.createElement('div');
    carousel.className = 'design-carousel';
    const thumbs = [];
    const hoverSteps = carouselThumbHoverSteps(thumbSize);
    project.photos.forEach((label, i) => {
      const thumb = document.createElement('div');
      thumb.className = 'design-carousel-thumb';
      thumb.style.transitionTimingFunction = `steps(${hoverSteps}, end)`;
      const image = project.images && project.images[i];
      if (image) {
        // A real photo: the thumb is exactly the photo - its shared height,
        // its own width from its own aspect ratio (see .has-image in CSS).
        thumb.classList.add('has-image');
        thumb.style.aspectRatio = `${image.w} / ${image.h}`;
        thumb.appendChild(createProjectImage(image, project.title));
      } else {
        thumb.textContent = label;
      }
      // A photo opens its project - but only on a real click, never at the
      // end of a drag/swipe that started on it. Exception: a photo still
      // sticking out of its closed tab (the row was stepped along, then the
      // tab closed) only retracts this one row back into its tab - the tab
      // stays closed, the project doesn't open, and the click never reaches
      // the landing/tab handlers.
      onClickWithoutDrag(thumb, e => {
        if (isRetractable()) {
          e.stopPropagation();
          retractCarousel();
          return;
        }
        openDesignPhotoDrawer(project, label, title.getBoundingClientRect().left);
      });
      // On the landing, a touch alone opens a tab (script.js's touchstart
      // trigger) - so a tap meant to retract has to stop there too.
      thumb.addEventListener('touchstart', e => {
        if (activeIndex < 0 && isRetractable()) e.stopPropagation();
      }, { passive: true });
      carousel.appendChild(thumb);
      thumbs.push(thumb);
    });
    carouselPortal.appendChild(carousel);
    // Exactly one photo is ever enlarged: whichever one the prev/next
    // buttons have currently brought to the front (the one sitting right
    // above the buttons themselves) - starts on the first.
    thumbs[0].classList.add('is-current');
    let currentThumbIndex = 0;
    function setCurrentThumb(index) {
      const clamped = Math.max(0, Math.min(thumbs.length - 1, index));
      if (clamped === currentThumbIndex) return;
      thumbs[currentThumbIndex].classList.remove('is-current');
      thumbs[clamped].classList.add('is-current');
      currentThumbIndex = clamped;
    }
    layer.appendChild(carouselPortal);

    // Step navigation - one photo at a time - replaces the old drag/wheel
    // scrolling. A sibling of the portal (not a descendant of the scrolling
    // track), positioned by positionDesignCarousels to sit just below the
    // first photo, so it never scrolls away with the row itself.
    const carouselNav = document.createElement('div');
    carouselNav.className = 'design-carousel-nav';
    const prevBtn = createNavControl('prev', 'design-carousel-nav-btn', () => stepTo(currentThumbIndex - 1));
    const nextBtn = createNavControl('next', 'design-carousel-nav-btn', () => stepTo(currentThumbIndex + 1));
    // One photo's worth of travel (its own width plus the gap to the next
    // one), snapped to the tab-panel grid so the step feels like the same
    // rasterized motion as everything else - same technique as the old
    // drag's own scrollLeft snapping.
    // The scroll target always comes from the current photo's own slot in
    // the row (its offset from the first photo's), never from the row's
    // in-flight scrollLeft - so clicking again before the previous step has
    // finished animating still lands exactly one photo further, and the
    // enlarged photo always stays in the first slot. Read from the laid-out
    // row, so photos of different widths (real images) step by their own
    // width plus the row's gap; placeholders step by thumbSize + the gap.
    // These buttons live in the content layer, not inside the project block,
    // so a click here only ever steps the row - it can't reach any handler
    // that opens the project.
    const stepTo = index => {
      setCurrentThumb(index);
      const target = thumbs[currentThumbIndex].offsetLeft - thumbs[0].offsetLeft;
      animateScrollLeft(carouselPortal, target, CAROUSEL_NAV_STEP_DURATION_MS);
    };
    // Tab closed with this row stepped away from its resting place (the
    // first photo in the first slot) - so its photos can stick out of the
    // tab. retractCarousel steps it back there with the arrows' own motion,
    // touching no other carousel.
    function isRetractable() {
      return !panelEl.classList.contains('is-active') &&
        (currentThumbIndex !== 0 || carouselPortal.scrollLeft !== 0);
    }
    function retractCarousel() {
      stepTo(0);
    }
    carouselNav.appendChild(prevBtn);
    carouselNav.appendChild(nextBtn);
    // Appended after every photo row (see the end of this function), so the
    // arrows are always the topmost thing in this tab's layer.
    navs.push(carouselNav);

    designCarouselPortals.push({ panelId, anchor: carouselAnchor, portal: carouselPortal, nav: carouselNav });
    forwardScrollToPanel(carouselPortal, panelEl);
    forwardScrollToPanel(carouselNav, panelEl);

    const openThisProjectDrawer = () => toggleDesignPhotoDrawer(project, title.getBoundingClientRect().left);

    block.addEventListener('mouseenter', () => {
      if (panelsAnimating || !panelEl.classList.contains('is-active')) return;
      showDesignHoverBar(title, year);
    });
    block.addEventListener('mouseleave', hideDesignHoverBar);
    // Only the title (and the photos, above) open the project - the rest of
    // the block (the empty space around the title, the row the arrows sit
    // in) does nothing. A click on a still-closed tab's visible title opens
    // that tab instead (the block isn't inside its panel, so it can't rely
    // on the click bubbling up to it).
    title.addEventListener('click', () => {
      if (panelsAnimating) return;
      if (!panelEl.classList.contains('is-active')) {
        openPanelFromContent(panelId);
        return;
      }
      openThisProjectDrawer();
    });

    // This project's own two background bands - part of the block, so they
    // scroll with it and ride its tab's slide like everything else in it.
    // Sized/placed per layout pass by positionProjectBands.
    ['is-photos', 'is-caption'].forEach(kind => {
      const band = document.createElement('div');
      band.className = 'design-project-band ' + kind;
      block.appendChild(band);
    });

    // Images first, project data below - inverted from title/tags/photos.
    block.appendChild(carouselAnchor);
    block.appendChild(header);
    if (showTags) block.appendChild(tags);

    // The About ribbon's own leaf for this project - NOT nested inside block
    // (appended straight to panelEl instead, see below), so it can be
    // position:fixed at a constant viewport box instead of tracking this
    // block's own (sliding, scrolling) column - see the CSS comment on
    // .design-project-rect and positionProjectRectsForPanel. Its own top is
    // still derived from this block's live position every layout pass, so it
    // still rides along with this pill vertically (just not horizontally).
    const rect = document.createElement('div');
    rect.className = 'design-project-rect';
    if (palette) rect.style.backgroundColor = palette.rect;
    rectEls.push({ el: rect, block });

    container.appendChild(block);
  });

  if (PERSONAL_PHOTOS_BY_PANEL[panelId]) {
    container.appendChild(buildPersonalPhotos(panelEl, PERSONAL_PHOTOS_BY_PANEL[panelId]));
  }

  // Arrows last, above every photo row (see the layer comment at the top).
  // positionDesignProjects keeps the column glued to its panel's live left
  // (plus a fixed internal offset) and to the panel's own vertical scroll;
  // the panel keeps an invisible spacer of the content's height so it still
  // scrolls the same distance as before.
  navs.forEach(nav => layer.appendChild(nav));
  tabsContainer.appendChild(layer);
  forwardScrollToPanel(container, panelEl);
  const scrollSpacer = document.createElement('div');
  scrollSpacer.className = 'panel-scroll-spacer';
  panelEl.appendChild(scrollSpacer);
  scrollSpacerByPanel[panelId] = scrollSpacer;
  // Body-level (not a descendant of tabsContainer, which is its own,
  // entirely separate stacking context capped at a low z-index - see the
  // DESIGN_ABOVE_CANVAS_Z comment) so this project's own rectangle still
  // reads clearly over the OSATNIK glyph (#nameCanvas, z-index:1000) when
  // scrolled up past it, instead of disappearing behind it. Safe to always
  // body-parent regardless of covered/active state - unlike the carousel
  // portal (see updateDesignCarouselStacking), a rect's covering is handled
  // entirely by refreshRectVisibility's own visibility toggle, not by DOM
  // nesting/z-index, so there's no "covered by the wrong panel" risk here.
  rectEls.forEach(({ el }) => {
    document.body.appendChild(el);
    el.style.zIndex = RECT_MORPH_Z;
  });
  projectsElByPanel[panelId] = container;
  projectRectElsByPanel[panelId] = rectEls;

  // The panel itself is the scroll container (see the design-only overflow-y
  // rule in style.css) - .design-projects and its anchors move with it
  // automatically since they're positioned relative to it, but the carousel
  // portals are portaled OUT to tabsContainer and only ever repositioned from
  // their anchors' live getBoundingClientRect() on specific triggers (resize,
  // tab switch/transition). Scrolling isn't one of those triggers on its
  // own, so without this the portals would drift out of sync with their
  // anchors as soon as the panel scrolls. Same reasoning for this panel's own
  // .design-project-rect elements (position:fixed now - see
  // positionProjectRectsForPanel - so they're no longer ordinary scrolling
  // descendants either).
  panelEl.addEventListener('scroll', () => {
    applyProjectsScroll(panelId);
    positionDesignCarousels();
    positionProjectRectsForPanel(panelId, projectRectWidth());
  });
}

// The content layer isn't inside its panel (the scroll container), so a
// wheel/touch scroll that starts over it wouldn't reach the panel on its
// own - pass it on, so scrolling over the projects/photos scrolls the tab
// exactly as before.
function forwardScrollToPanel(el, panelEl) {
  el.addEventListener('wheel', e => {
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? panelEl.clientHeight : 1;
    panelEl.scrollTop += e.deltaY * unit;
  }, { passive: true });
  let lastTouchY = null;
  el.addEventListener('touchstart', e => { lastTouchY = e.touches[0].clientY; }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (lastTouchY == null) return;
    const y = e.touches[0].clientY;
    panelEl.scrollTop += lastTouchY - y;
    lastTouchY = y;
  }, { passive: true });
  el.addEventListener('touchend', () => { lastTouchY = null; }, { passive: true });
}

// Same as clicking the tab itself (see the panel click handler in
// buildPanels), for clicks landing on a closed tab's visible content.
function openPanelFromContent(panelId) {
  const index = PANELS.findIndex(p => p.id === panelId);
  if (activeIndex < 0) {
    pendingLandingOpenIndex = index;
    if (typeof trigger === 'function') trigger();
    return;
  }
  selectPanel(index);
}

// A section title plus a grid of loose photos, appended as the last child of
// a panel's own .design-projects column so it follows the projects in the
// same vertical flow/scroll. Clicking any photo opens the shared project
// viewer (openDesignPhotoDrawer) straight at that photo, with `collection`
// as its "project" - so the arrows/keys/drawer thumbs step only through
// this collection. Columns/width/spacing are set in sizePersonalPhotos.
// The title is built exactly like a project's own (same header/title
// classes, same per-letter grid-char spans), so it reads as one more title
// in the same system and starts at the same x as every project title.
function buildPersonalPhotos(panelEl, collection) {
  const section = document.createElement('div');
  section.className = 'personal-photos';

  const header = document.createElement('div');
  header.className = 'design-project-header';
  const title = document.createElement('span');
  title.className = 'design-project-title';
  collection.title.split('').forEach(ch => {
    const charEl = document.createElement('span');
    charEl.className = 'tab-title-char grid-char';
    charEl.textContent = ch;
    title.appendChild(charEl);
  });
  header.appendChild(title);

  // What the grid and the viewer currently show: the whole collection, or -
  // with a filter selected (collection.filters) - the same collection
  // narrowed to that filter's items, in their same relative order.
  let view = collection;

  // collection.projectHeader: the title behaves exactly like a project's
  // (see buildDesignProjects) - the same dark gray band behind it
  // (positionProjectBands), the same orange hover bar, pointer, and a click
  // that opens the shared viewer at the collection's first item. No year,
  // tags or text - the gallery is the content.
  if (collection.projectHeader) {
    section.classList.add('is-project-header');
    const caption = document.createElement('div');
    caption.className = 'design-project-band is-caption';
    section.appendChild(caption);
    title.addEventListener('mouseenter', () => {
      if (panelsAnimating || !panelEl.classList.contains('is-active')) return;
      showDesignHoverBar(title, null);
    });
    title.addEventListener('mouseleave', hideDesignHoverBar);
    title.addEventListener('click', () => {
      if (panelsAnimating) return;
      if (!panelEl.classList.contains('is-active')) {
        openPanelFromContent(panelEl.dataset.panel);
        return;
      }
      openDesignPhotoDrawer(view, null, title.getBoundingClientRect().left);
    });
  }

  const grid = document.createElement('div');
  grid.className = 'personal-photos-grid';
  // One cell element per item, made on first show and reused by every
  // filter afterwards - so switching filters never reloads any media.
  const photoEls = [];
  function photoElFor(itemIndex) {
    if (photoEls[itemIndex]) return photoEls[itemIndex];
    const label = collection.photos[itemIndex];
    const photo = document.createElement('div');
    photo.className = 'personal-photo';
    // Real media (collection.images - a photo, GIF or video, the same
    // element the carousels and viewer use) fits whole inside the cell;
    // otherwise the numbered placeholder.
    const image = collection.images && collection.images[itemIndex];
    if (image) {
      photo.classList.add('has-image');
      photo.appendChild(createProjectImage(image, collection.title));
    } else {
      photo.textContent = label;
    }
    photo.addEventListener('click', () => {
      // Same guard as the project blocks: a click on a still-closed tab's
      // visible content just opens that tab.
      if (panelsAnimating) return;
      if (!panelEl.classList.contains('is-active')) {
        openPanelFromContent(panelEl.dataset.panel);
        return;
      }
      openDesignPhotoDrawer(view, label, title.getBoundingClientRect().left);
    });
    photoEls[itemIndex] = photo;
    return photo;
  }

  // The items arrive already in their random order (the collection's one
  // shuffled array - its single source of truth, the viewer's order too);
  // the grid lays the shown ones out in that order, reading left to right,
  // into occupied cells drawn at random once per page load per filter
  // (personalPhotoLayout, cached in layouts) - so the shown items close up
  // with no hole left by a hidden one. Each cell carries its item's own
  // label (a stable id), and a click opens the viewer at that label's index
  // in the shown array - never at the cell's position.
  const filters = collection.filters || [{ test: () => true }];
  const layouts = [];
  function renderGrid(filterIndex) {
    const shown = collection.photos.map((_, i) => i)
      .filter(i => filters[filterIndex].test(collection.images && collection.images[i]));
    view = shown.length === collection.photos.length ? collection : {
      ...collection,
      photos: shown.map(i => collection.photos[i]),
      images: collection.images && shown.map(i => collection.images[i])
    };
    if (!layouts[filterIndex]) layouts[filterIndex] = personalPhotoLayout(shown.length, collection.layoutSeed);
    grid.textContent = '';
    layouts[filterIndex].forEach(photoIndex => {
      if (photoIndex < 0) {
        // An empty cell: keeps its slot (size, position, gaps) so the photos
        // after it never shift into it - nothing visible, not part of the
        // viewer's navigation (which walks the shown photos, not the cells).
        const empty = document.createElement('div');
        empty.className = 'personal-photo-empty';
        empty.setAttribute('aria-hidden', 'true');
        grid.appendChild(empty);
        return;
      }
      grid.appendChild(photoElFor(shown[photoIndex]));
    });
  }
  renderGrid(0);

  // One continuous white band behind the whole grid, empty cells included -
  // the same white band the projects have (see positionProjectBands, which
  // places it: same left/right as theirs, top/bottom = the grid's own).
  const band = document.createElement('div');
  band.className = 'design-project-band is-photos';
  section.appendChild(band);

  section.appendChild(header);

  // collection.filters: a row of filters under the title - a project's own
  // tags row (same markup/classes, so the same type and spacing), each one
  // clickable. Exactly one is selected (the first on every load), marked by
  // the orange rectangle under it (placeGalleryFilterMark).
  if (collection.filters) {
    const filterRow = document.createElement('div');
    filterRow.className = 'design-project-tags personal-photos-filters';
    const mark = document.createElement('div');
    mark.className = 'personal-photos-filter-mark';
    section.appendChild(mark);
    const filterEls = collection.filters.map((filter, i) => {
      const filterEl = document.createElement('span');
      filterEl.className = 'personal-photos-filter';
      filterEl.textContent = filter.label;
      if (filter.markFromContact) filterEl.dataset.markFromContact = '';
      filterEl.addEventListener('click', () => {
        if (panelsAnimating) return;
        if (!panelEl.classList.contains('is-active')) {
          openPanelFromContent(panelEl.dataset.panel);
          return;
        }
        if (filterEl.classList.contains('is-active')) return;
        filterEls.forEach(el => el.classList.toggle('is-active', el === filterEl));
        renderGrid(i);
        // The grid's height, its white band, the orange mark and the tab's
        // scroll range all follow from the new grid.
        positionDesignProjects();
      });
      filterRow.appendChild(filterEl);
      return filterEl;
    });
    filterEls[0].classList.add('is-active');
    section.appendChild(filterRow);
  }

  section.appendChild(grid);
  return section;
}

// The selected filter's orange rectangle: exactly the word's own width, from
// the gray band's bottom (the title's bottom - see positionProjectBands) down
// to the bottom of the filter's own box - which ends on the bottom edge of
// its (hover-only, otherwise transparent) dotted underline, so the selected
// state and the hover underline share one bottom line. A filter flagged
// markFromContact (All) keeps its right edge on the word's but reaches left
// to contactLeftX - the Contact tab's left edge, carried along with the
// column (see placeGallery in positionProjectBands).
function placeGalleryFilterMark(section, contactLeftX) {
  const mark = section.querySelector('.personal-photos-filter-mark');
  const active = section.querySelector('.personal-photos-filter.is-active');
  if (!mark || !active) return;
  const sectionRect = section.getBoundingClientRect();
  const textRect = measureTextInkRect(active);
  const top = section.querySelector('.design-project-title').getBoundingClientRect().bottom;
  const bottom = active.getBoundingClientRect().bottom;
  const left = 'markFromContact' in active.dataset && contactLeftX != null
    ? Math.min(contactLeftX, textRect.left)
    : textRect.left;
  mark.style.left = (left - sectionRect.left) + 'px';
  mark.style.width = (textRect.right - left) + 'px';
  mark.style.top = Math.round(top - sectionRect.top) + 'px';
  mark.style.height = Math.max(0, Math.round(bottom - top)) + 'px';
}

// Cell-by-cell layout for a media grid (personal photos / studies), in
// reading order: a media index (the items keep their own order - the
// viewer's navigation order) or -1 for an empty cell. Only the positions
// are random: a fresh seed is drawn once per gallery per page load (see
// buildPersonalPhotos - called once), and everything below runs off that
// seed's PRNG - so each reload gets a new composition, while within one
// load it never changes on hover/scroll/tab switches/opening media.
// Each row of PERSONAL_PHOTO_COLUMNS holds 4, 3, 2 or 1 items
// (PERSONAL_PHOTO_ROW_WEIGHTS), never the same count twice in a row, in any
// columns. A row's positions are re-drawn if they repeat the previous row's,
// form a checkerboard with it (2/2 exact complement), or would leave the
// same column empty three rows running; a whole composition that leaves
// any column completely empty is re-drawn from scratch. The last row is
// completed with empty cells, so the grid's lines close a full rectangle.
// layoutSeed (optional) pins one composition instead.
const PERSONAL_PHOTO_ROW_WEIGHTS = { 4: 0.2, 3: 0.35, 2: 0.3, 1: 0.15 };
function personalPhotoLayout(photoCount, layoutSeed) {
  let seed = layoutSeed == null ? Math.floor(Math.random() * 4294967296) | 0 : layoutSeed;
  for (let attempt = 0; attempt < 50; attempt++) {
    const cells = personalPhotoLayoutFromSeed(photoCount, seed);
    const cols = PERSONAL_PHOTO_COLUMNS;
    const columnEmpty = photoCount >= cols &&
      [...Array(cols).keys()].some(c => cells.every((v, i) => i % cols !== c || v < 0));
    if (!columnEmpty || layoutSeed != null) return cells;
    seed = (seed + 1) | 0;
  }
  return personalPhotoLayoutFromSeed(photoCount, seed);
}

function personalPhotoLayoutFromSeed(photoCount, seed) {
  const random = () => { // mulberry32
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const cols = PERSONAL_PHOTO_COLUMNS;
  const pickCount = exclude => {
    const options = Object.entries(PERSONAL_PHOTO_ROW_WEIGHTS)
      .map(([n, w]) => [Number(n), w])
      .filter(([n]) => n <= cols && n !== exclude);
    const total = options.reduce((sum, [, w]) => sum + w, 0);
    let r = random() * total;
    for (const [n, w] of options) { if ((r -= w) < 0) return n; }
    return options[options.length - 1][0];
  };
  const emptiesOf = filled => new Set([...Array(cols).keys()].filter(c => !filled.has(c)));

  const cells = [];
  const history = []; // empty-column sets of previous rows
  let prevCount = null;
  let next = 0;
  while (next < photoCount) {
    const count = Math.min(pickCount(prevCount), photoCount - next);
    let filled = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate = new Set();
      while (candidate.size < count) candidate.add(Math.floor(random() * cols));
      const empties = emptiesOf(candidate);
      const prev = history[history.length - 1];
      const prev2 = history[history.length - 2];
      const same = prev && prev.size === empties.size && [...empties].every(c => prev.has(c));
      const checkerboard = prev && empties.size * 2 === cols && prev.size * 2 === cols &&
        [...empties].every(c => !prev.has(c));
      const stacked = prev && prev2 && [...empties].some(c => prev.has(c) && prev2.has(c));
      filled = candidate;
      if (!(same && empties.size) && !checkerboard && !stacked) break;
    }
    history.push(emptiesOf(filled));
    prevCount = count;
    for (let c = 0; c < cols; c++) cells.push(filled.has(c) ? next++ : -1);
  }
  return cells;
}

// The grid spans the carousels' own horizontal extent: from the enlarged
// photo's left edge (the column's left + .design-carousel-thumb's own 7px
// nudge, minus how far the 2.25 scale - pivoting on the thumb's bottom-
// center - pushes it out to the left) to the carousel clip's right edge,
// i.e. this panel's own right edge once it's the active tab (the right-group
// math computeTargets uses). Read from the panel's ACTIVE layout rather
// than its current one, so the grid never reflows while tabs slide.
//
// A visible grid of square cells with a street between every two of them,
// across and down, exactly the carousels' photo gap (--project-media-gap):
// the columns and their streets share that width exactly
// (cell = (width - (columns - 1) * street) / columns, height = width). Each
// cell's outline sits inside its own square (see .personal-photo in CSS),
// so the lines take no extra room. How many columns: PERSONAL_PHOTO_COLUMNS
// on desktop, fewer only when that many cells of the carousels' enlarged
// ("is-current") photo size - plus the streets - can't fit (the responsive
// rule the grid always had). Shared by every panel's gallery.
const PERSONAL_PHOTO_COLUMNS = 4;

// The width every gallery's grid is built from: each gallery's room runs
// from the carousels' left edge to its own panel's right edge once active -
// which differs per panel - so all of them take the narrowest, and every
// gallery shares one cell size (and still fits its own panel).
function sharedGalleryWidth() {
  const containerLeft = tabsContainer.getBoundingClientRect().left;
  const gridLeft = contentOriginX();
  const widths = Object.keys(PERSONAL_PHOTOS_BY_PANEL)
    .map(id => PANELS.findIndex(p => p.id === id))
    .filter(idx => idx >= 0)
    .map(idx => containerLeft + panelActiveRight(idx) - gridLeft);
  return Math.max(0, Math.round(Math.min(...widths)));
}
function sizePersonalPhotos(projectsEl, panelId) {
  const section = projectsEl.querySelector('.personal-photos');
  if (!section) return;
  const grid = section.querySelector('.personal-photos-grid');
  const blocks = projectsEl.querySelectorAll('.design-project');
  if (!blocks.length) return;
  const firstAnchor = blocks[0].querySelector('.design-carousel-anchor');
  const anchorRect = firstAnchor.getBoundingClientRect();
  const carouselEl = document.querySelector('.design-carousel');
  const carouselStyle = carouselEl ? getComputedStyle(carouselEl) : null;
  const rowPadding = carouselStyle ? parseFloat(carouselStyle.paddingBottom) || 0 : 0;
  // The carousels' own photo-to-photo gap (.design-carousel's gap), read
  // from the live style so the grid can never drift from it.
  const photoGap = carouselStyle ? parseFloat(carouselStyle.columnGap) || CAROUSEL_GAP : CAROUSEL_GAP;

  const minCellWidth = Math.round(CAROUSEL_THUMB_SIZE * CAROUSEL_THUMB_HOVER_SCALE);

  // Horizontal: the title stays in the project titles' column - only the
  // grid itself is offset/widened to the carousels' extent.
  const offsetX = enlargedPhotoOffsetX();
  const width = sharedGalleryWidth();
  const fitting = Math.floor((width + photoGap) / (minCellWidth + photoGap));
  const columns = Math.max(1, Math.min(PERSONAL_PHOTO_COLUMNS, fitting));
  // The streets are the grid's own CSS gap (--project-media-gap, the same
  // value photoGap reads from the carousels).
  const cell = Math.max(1, Math.floor((width - (columns - 1) * photoGap) / columns));
  grid.style.marginLeft = offsetX + 'px';
  grid.style.width = (cell * columns + (columns - 1) * photoGap) + 'px';
  grid.style.setProperty('--personal-photo-columns', columns);
  grid.style.setProperty('--personal-photo-width', cell + 'px');
  grid.style.setProperty('--personal-photo-height', cell + 'px');
  // With fewer columns the 4-column layout reflows into rows of `columns`:
  // pad its last row with empty cells so the lines still close it.
  grid.querySelectorAll('.personal-photo-empty.is-pad').forEach(el => el.remove());
  const remainder = grid.children.length % columns;
  for (let i = 0; remainder && i < columns - remainder; i++) {
    const pad = document.createElement('div');
    pad.className = 'personal-photo-empty is-pad';
    pad.setAttribute('aria-hidden', 'true');
    grid.appendChild(pad);
  }

  // Title -> grid: the projects' own photo -> title distance, measured live
  // (bottom of the carousel photo, i.e. anchor bottom minus the row's
  // padding, to the top of the project's title row) and reused inverted.
  const firstHeader = blocks[0].querySelector('.design-project-header');
  const photoToTitle = firstHeader.getBoundingClientRect().top - (anchorRect.bottom - rowPadding);
  const projectHeader = section.classList.contains('is-project-header');
  const sectionTitle = section.querySelector('.design-project-title');
  grid.style.marginTop = '';
  if (projectHeader) {
    // A project-style header (studies) and its gallery are one block: the
    // grid - and so the white band, which starts at its top - begins right
    // at the title's bottom, where the gray band ends (positionProjectBands).
    // Only the section's containers move; the grid itself is untouched.
    // With a filter row, it sits under the title exactly as a project's tags
    // do (the projects' own title -> tags gap), and the grid starts that
    // same gap below it.
    section.style.gap = '0px';
    const filterRow = section.querySelector('.personal-photos-filters');
    let gridAfter = sectionTitle;
    let gridGap = 0;
    if (filterRow) {
      const tagsGap = parseFloat(getComputedStyle(blocks[0]).rowGap) || 0;
      filterRow.style.marginTop = '';
      const tagsOffset = filterRow.getBoundingClientRect().top -
        section.querySelector('.design-project-header').getBoundingClientRect().bottom;
      filterRow.style.marginTop = Math.round(tagsGap - tagsOffset) + 'px';
      gridAfter = filterRow;
      gridGap = tagsGap;
    }
    const overhang = grid.getBoundingClientRect().top - gridAfter.getBoundingClientRect().bottom;
    grid.style.marginTop = Math.round(gridGap - overhang) + 'px';
  } else {
    section.style.gap = Math.round(photoToTitle) + 'px';
  }

  // Last carousel -> title: the projects' own visible spacing (one
  // project's text to the next project's enlarged photo), measured from the
  // live layout: the block-to-block distance minus how far the enlarged
  // photo shows above its own block (the portal is anchor height * scale
  // tall, bottom-aligned to the anchor).
  if (blocks.length < 2) return;
  const firstRect = blocks[0].getBoundingClientRect();
  const secondRect = blocks[1].getBoundingClientRect();
  const rhythm = (secondRect.top - firstRect.bottom) - anchorRect.height * (CAROUSEL_THUMB_HOVER_SCALE - 1);
  const lastBlock = blocks[blocks.length - 1];
  const lastAnchorBottom = lastBlock.querySelector('.design-carousel-anchor').getBoundingClientRect().bottom;
  const textBelowCarousel = lastBlock.getBoundingClientRect().bottom - lastAnchorBottom;
  const flexGap = parseFloat(getComputedStyle(projectsEl).rowGap) || 0;
  if (projectHeader) {
    // A project-style section starts a new part of the tab: its gray band's
    // top sits STUDIES_SECTION_RHYTHMS project rhythms (the visible distance
    // between one project and the next) below the last project - only here,
    // the projects' own spacing untouched. The gray band is a project's
    // (its carousel photos' bottom -> title bottom) and ends at the title's
    // bottom, so it reaches captionHeight above it.
    const captionHeight = blocks[0].querySelector('.design-project-title').getBoundingClientRect().bottom -
      (anchorRect.bottom - rowPadding);
    const titleOffset = sectionTitle.getBoundingClientRect().bottom - section.getBoundingClientRect().top;
    section.style.marginTop = Math.round(
      STUDIES_SECTION_RHYTHMS * rhythm - flexGap - titleOffset + captionHeight
    ) + 'px';
    return;
  }
  section.style.marginTop = Math.round(rhythm - textBelowCarousel - flexGap) + 'px';
}
const STUDIES_SECTION_RHYTHMS = 2;

// Essays tab's own project blocks - entirely independent of
// buildDesignProjects above: no carousel, no portal, no photo drawer, no
// hover bar. Each essay is a single white card built directly inside
// panelEl, registered into the same projectsElByPanel map buildDesignProjects
// uses so positionDesignProjects() (unchanged, generic over every registered
// panel) positions/sizes it against the exact same box Design/Photography's
// own project column uses - same title typography (the .design-project-
// title/-year/-header classes are reused as-is), same left/top anchor, same
// column width. Only the tags row is swapped for a summary paragraph, and a
// click toggles the card open to reveal its full body text underneath.
function buildEssayCards(panelEl) {
  const container = document.createElement('div');
  container.className = 'essay-cards';

  ESSAYS_PROJECTS.forEach(essay => {
    const card = document.createElement('div');
    card.className = 'essay-card';

    // Everything visible while the card is closed - see the CSS comment on
    // .essay-card-hit for why the click target stops here instead of
    // covering the (zero-height-until-opened) body below it too.
    const hit = document.createElement('div');
    hit.className = 'essay-card-hit';
    hit.setAttribute('role', 'button');
    hit.setAttribute('tabindex', '0');
    hit.setAttribute('aria-expanded', 'false');

    const header = document.createElement('div');
    header.className = 'design-project-header';
    const title = document.createElement('span');
    title.className = 'design-project-title';
    essay.title.split('').forEach(ch => {
      const charEl = document.createElement('span');
      charEl.className = 'tab-title-char grid-char';
      charEl.textContent = ch;
      title.appendChild(charEl);
    });
    const year = document.createElement('span');
    year.className = 'design-project-year';
    essay.year.split('').forEach(ch => {
      const charEl = document.createElement('span');
      charEl.className = 'tab-title-char grid-char';
      charEl.textContent = ch;
      year.appendChild(charEl);
    });
    header.appendChild(title);
    header.appendChild(year);

    const summary = document.createElement('p');
    summary.className = 'essay-card-summary';
    summary.textContent = essay.summary;

    hit.appendChild(header);
    hit.appendChild(summary);

    const bodyWrap = document.createElement('div');
    bodyWrap.className = 'essay-card-body-wrap';
    // .essay-card-body is the grid row's own item (min-height:0, no padding
    // of its own - see the CSS comment) - the actual padded text content
    // lives one level deeper in .essay-card-body-inner, so the padding never
    // stops the row from collapsing fully to 0fr while closed.
    const body = document.createElement('div');
    body.className = 'essay-card-body';
    const bodyInner = document.createElement('div');
    bodyInner.className = 'essay-card-body-inner';
    essay.body.forEach(text => {
      const p = document.createElement('p');
      p.textContent = text;
      bodyInner.appendChild(p);
    });
    body.appendChild(bodyInner);
    bodyWrap.appendChild(body);

    // Recomputes the panel's own scroll padding (positionDesignProjects,
    // via its lastElementChild height read) once the expand/collapse
    // animation actually finishes, so the last card can always be scrolled
    // fully into view whichever state it's in. positionDesignProjects loops
    // every registered panel, but every other panel's inputs are unchanged
    // by this, so nothing visibly moves for Design/Photography.
    bodyWrap.addEventListener('transitionend', e => {
      if (e.target === bodyWrap) positionDesignProjects();
    });

    function toggle() {
      // Same guard buildDesignProjects' own project blocks use: only act
      // once Essays is actually the open tab, so clicking a still-covered
      // card just opens the Essays tab (via the plain panel click handler
      // this bubbles up to - see buildPanels) instead of also expanding.
      if (panelsAnimating || !panelEl.classList.contains('is-active')) return;
      const open = card.classList.toggle('is-open');
      hit.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    hit.addEventListener('click', toggle);
    hit.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    card.appendChild(hit);
    card.appendChild(bodyWrap);
    container.appendChild(card);
  });

  panelEl.appendChild(container);
  projectsElByPanel.essays = container;
}

// The one horizontal origin every open tab's content starts at: the right
// edge of Photography's own .tab-color-block while Photography is open.
// Derived from the same math that actually places things (computeTargets'
// active-panel left, measureTitleWidth for the block's width - see
// positionTabColorBlocks) rather than measured live, so it's the same value
// whichever tab is currently open or mid-slide. Used by the Design/
// Photography project columns (their first enlarged photo's left edge -
// see projectColumnLeftX) and About's text (sizeAboutBody).
function contentOriginX() {
  const idx = PANELS.findIndex(p => p.id === 'photography');
  return contentLeftX() + measureTitleWidth(panelEls[idx]);
}

// The LEFT edge of that same color block (= the Photography panel's own left
// while it's open - the block sits at the panel's left:0), same derivation.
// The landing tagline and About's skills ribbon window start here (see
// positionAboutMarquee/positionLandingTagline).
function contentLeftX() {
  const idx = PANELS.findIndex(p => p.id === 'photography');
  const offset = readPx('--reset-tab-width', 28) + readPx('--tabs-left-shift', 0);
  return tabsContainer.getBoundingClientRect().left + offset + idx * computeOverlapStep();
}

// How far the enlarged ("is-current") carousel photo's left edge sits from
// its project column's left: the thumb's own 7px nudge, minus how far the
// scale (pivoting on the thumb's bottom-center) pushes it out to the left.
const CAROUSEL_THUMB_NUDGE_X = 7; // keep in sync with .design-carousel-thumb's left
function enlargedPhotoOffsetX() {
  const enlargedWidth = CAROUSEL_THUMB_SIZE * CAROUSEL_THUMB_HOVER_SCALE;
  return Math.round(CAROUSEL_THUMB_NUDGE_X - (enlargedWidth - CAROUSEL_THUMB_SIZE) / 2);
}

// The project column's left, chosen so its first enlarged photo starts
// exactly at contentOriginX.
function projectColumnLeftX() {
  return contentOriginX() - enlargedPhotoOffsetX();
}

// CONTENT_LEFT_X - the shared left edge of the site's running text: the
// Contact title, which sits on the Design project titles' own x (the
// project column's left). About's body text (sizeAboutBody), its skills
// ribbon window and the landing tagline (both via aboutBodyLeftX) all start
// here too, so moving this one reference moves them all.
function contentTextLeftX() {
  return projectColumnLeftX();
}

// Viewport y of a tab title's dotted underline (the top of the letters'
// border-bottom). Every tab's title sits at the same height (.tab-header's
// shared padding) and its first letter never moves between the horizontal
// and vertical layouts (see tabTitleCharSlot), so it's read off
// Photography's first title letter at any time.
function tabTitleUnderlineY() {
  const idx = PANELS.findIndex(p => p.id === 'photography');
  const firstChar = tabTitleStates[idx] && tabTitleStates[idx].chars[0];
  if (!firstChar) return null;
  const border = parseFloat(getComputedStyle(firstChar).borderBottomWidth) || 0;
  return firstChar.getBoundingClientRect().bottom - border;
}

// Essays' own (unused) fallback position - Design/Photography derive theirs
// from contentOriginX/tabTitleUnderlineY instead (see positionDesignProjects).
const DESIGN_PROJECTS_TOP_EDGE_Y = 294;
// The block's own width is measured from here, not from its (moving)
// left edge - keeps the title/tags column at its
// original width regardless of how far right the block itself has been
// nudged, rather than narrowing (and so wrapping the title across two
// lines) every time that moves closer to the fixed right edge below.
const DESIGN_PROJECTS_WIDTH_REFERENCE_LEFT_X = 279;
// Per-panel nudge added on top of DESIGN_PROJECTS_TOP_EDGE_Y - Essays sits
// lower. Design and Photography share the plain (unshifted) position.
const DESIGN_PROJECTS_TOP_OFFSET_BY_PANEL = { essays: 25 };

// Positions every panel's project-blocks container at this same fixed box
// (right edge still half the window width minus 10px, same rule About Me's
// text uses) - whichever of design/photography/essays is open, its own
// blocks land in exactly the same spot on screen as the others do.
// How wide a single essay card's header needs to be for .design-project-year
// (reused unchanged, still "position:relative; left:235px") to still land
// inside the card's own right edge: each per-letter grid-char title/year is
// exactly textLength * --glyph-cell-size wide (same math measureTitleWidth
// uses for tab titles), plus the header's own 12px gap, plus the year's own
// 235px extra push, plus .essay-card-hit's 24px side padding twice, plus a
// small safety buffer. Pure arithmetic, not a live measurement - stays
// correct across resize since --glyph-cell-size itself is resize-driven.
const ESSAY_CARD_YEAR_PUSH = 235;
const ESSAY_CARD_HEADER_GAP = 12;
const ESSAY_CARD_SIDE_PADDING = 24 * 2;
function essayCardRequiredWidth(title, year) {
  const cellSize = readPx('--glyph-cell-size', 20);
  return Math.ceil(
    ESSAY_CARD_SIDE_PADDING + title.length * cellSize + ESSAY_CARD_HEADER_GAP +
    year.length * cellSize + ESSAY_CARD_YEAR_PUSH + 10
  );
}
// The widest single essay card needs to be, across every essay - every card
// is sized uniformly (positionDesignProjects sets one shared width for the
// whole .essay-cards column, same as Design/Photography's own column), so
// this must cover whichever title/year combination needs the most room.
function essaysRequiredWidth() {
  return Math.max(...ESSAYS_PROJECTS.map(e => essayCardRequiredWidth(e.title, e.year)));
}

// The exact same width as the rectangle already visible on About Me
// (computeAboutRestingRect, defined further down) - every project's own
// .design-project-rect is sized to match it exactly, so every rectangle on
// the site, About's or any project's, is always that one same width. Falls
// back to the plain project-column width only in the (practically
// unreachable) case this runs before About's own rectangle exists yet.
function projectRectWidth() {
  const resting = computeAboutRestingRect();
  if (resting) return resting.width;
  const rightEdgeX = window.innerWidth / 2 - 10;
  return Math.max(0, Math.round(rightEdgeX - DESIGN_PROJECTS_WIDTH_REFERENCE_LEFT_X));
}

// Per-panel nudge on top of each project rect's own default position (block
// bottom + 10px, see below). Design and Photography both use the plain
// default.
const PROJECT_RECT_TOP_OFFSET_BY_PANEL = {};

// Every project's own .design-project-rect (see buildDesignProjects) is
// position:fixed, at a plain, constant viewport box (rectWidth, from
// projectRectWidth) - the SAME box regardless of which project or which tab
// is open, never a per-panel or mid-slide value - see the CSS comment on
// .design-project-rect for why: it must never visibly travel sideways as its
// tab slides open/closed, only change vertically (and split/merge) once a
// tab is actually opened. Only top is live/dynamic, read straight off the
// project block's own current getBoundingClientRect() - safe to do at any
// moment, including mid-slide, since panels only ever animate horizontally
// (left/width), never vertically (top:0;bottom:0 always), so a block's own Y
// position is stable through any transition. Called both from
// positionDesignProjects (every panel, every relevant layout pass) and from
// each panel's own 'scroll' listener (buildDesignProjects) - this rect is no
// longer a normal scrolling descendant of its panel now that it's
// position:fixed, so scrolling needs its own explicit trigger to keep it
// lined up with its project block, the same way the portaled carousel
// already does.
function positionProjectRectsForPanel(panelId, rectWidth) {
  const rectEntries = projectRectElsByPanel[panelId];
  if (!rectEntries) return;
  const topOffset = PROJECT_RECT_TOP_OFFSET_BY_PANEL[panelId] || 0;
  rectEntries.forEach(({ el, block }) => {
    const blockRect = block.getBoundingClientRect();
    el.style.left = Math.round(projectColumnLeftX()) + 'px';
    el.style.width = Math.round(rectWidth) + 'px';
    el.style.top = Math.round(blockRect.bottom + 10 + topOffset) + 'px';
  });
}

// Places every project panel's content layer (.design-projects - a sibling
// of the panels, see buildDesignProjects) against its own panel: coupled to
// the panel's live horizontal position every frame (so it slides with the
// tab when it opens, closes or gets pushed aside, never hidden for being
// closed), following its vertical scroll, never clipped to the panel's
// rectangle. Whether any of it is visible is left to where it physically
// is and to the fixed layer order (panelLayerZ/panelContentLayerZ).
function positionDesignProjects() {
  const panelIds = Object.keys(projectsElByPanel);
  if (!panelIds.length) return;
  const rightEdgeX = window.innerWidth / 2 - 10;
  const width = Math.max(0, Math.round(rightEdgeX - DESIGN_PROJECTS_WIDTH_REFERENCE_LEFT_X));
  const rectWidth = projectRectWidth();
  const columnLeftX = projectColumnLeftX();
  const containerRect = tabsContainer.getBoundingClientRect();
  const underlineY = tabTitleUnderlineY();

  panelIds.forEach(panelId => {
    const projectsEl = projectsElByPanel[panelId];
    const idx = PANELS.findIndex(p => p.id === panelId);
    const panel = panelEls[idx];
    if (!panel) return;
    // Essays only: widen the (shared, same-as-Design/Photography) default
    // column width if needed so the white card's own right edge still
    // reaches .design-project-year's unmoved, unchanged "left: 235px"
    // position - see essayCardRequiredWidth and the CSS comment above
    // .design-project-header. Every other panel keeps the plain shared width.
    projectsEl.style.width = (panelId === 'essays' ? Math.max(width, essaysRequiredWidth()) : width) + 'px';

    // Horizontal: glued to the panel - its live left (whatever it's doing
    // this frame: open, closed, mid-slide) plus a fixed internal offset,
    // the one that puts the column at columnLeftX while this tab is open.
    // Panel moves 300px -> content moves 300px.
    const internalX = columnLeftX - containerRect.left - panelActiveLeft(idx);
    const panelLeft = parseFloat(panel.style.left) || 0;
    projectsEl.style.left = Math.round(panelLeft + internalX) + 'px';

    // Vertical, at scroll 0 (applyProjectsScroll then follows the panel's
    // own scroll): Design/Photography's first enlarged photo's visible top
    // (its portal's top - anchor bottom minus anchor height * scale, see
    // positionDesignCarousels) lands on the tab title's dotted underline,
    // solved from the anchor's live offset inside the column.
    const firstAnchor = projectsEl.querySelector('.design-carousel-anchor');
    let baseTopY;
    if (firstAnchor && underlineY != null) {
      const anchorRect = firstAnchor.getBoundingClientRect();
      const photoTopOffset = anchorRect.bottom - projectsEl.getBoundingClientRect().top -
        anchorRect.height * CAROUSEL_THUMB_HOVER_SCALE;
      baseTopY = underlineY - photoTopOffset;
    } else {
      baseTopY = DESIGN_PROJECTS_TOP_EDGE_Y + (DESIGN_PROJECTS_TOP_OFFSET_BY_PANEL[panelId] || 0);
    }
    projectsBaseTopByPanel[panelId] = Math.round(baseTopY - containerRect.top);
    applyProjectsScroll(panelId);
    sizePersonalPhotos(projectsEl, panelId);
    positionProjectBands(projectsEl, idx, columnLeftX, containerRect.left);

    positionProjectRectsForPanel(panelId, rectWidth);

    // Without this, the panel's scrollable range only ever reaches as far as
    // the LAST project's own bottom edge - meaning, on a viewport shorter
    // than the full stacked height, later projects' title/tags can get stuck
    // somewhere in the middle of the screen and never scroll up far enough
    // to clear the sticky title header. Padding the container's bottom by
    // however much extra scroll room is needed extends the panel's
    // scrollHeight just enough that the last block's own top can be scrolled
    // flush against the header's bottom edge (not further - not a full extra
    // viewport of empty space to scroll through after it).
    const lastBlock = projectsEl.lastElementChild;
    const header = panel.querySelector('.tab-header');
    const lastBlockHeight = lastBlock ? lastBlock.getBoundingClientRect().height : 0;
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const extraScroll = Math.max(0, panel.clientHeight - lastBlockHeight - headerHeight);
    projectsEl.style.paddingBottom = Math.round(extraScroll) + 'px';
    // The panel's own scroll range = the content layer's full extent.
    const spacer = scrollSpacerByPanel[panelId];
    if (spacer) spacer.style.height = Math.round(projectsBaseTopByPanel[panelId] + projectsEl.offsetHeight) + 'px';
  });
}

// A panel's own left (tabsContainer coordinates) while it's the open tab -
// computeTargets' own active-panel formula.
function panelActiveLeft(index) {
  const offset = readPx('--reset-tab-width', 28) + readPx('--tabs-left-shift', 0);
  return offset + index * computeOverlapStep();
}

// ...and its right edge then: where the closed tabs after it start.
function panelActiveRight(index) {
  return tabsContainer.clientWidth - (panelEls.length - index - 1) * computeOverlapStep();
}

// Each project's two background bands (see buildDesignProjects), in the
// block's own coordinates - so they stay glued to it through scroll and
// tab slides without any positioning of their own.
//   Horizontal: the tab's whole gray area while it's open - from its color
//   block's right edge (panel left + measureTitleWidth, same as
//   positionTabColorBlocks) to the panel's right edge.
//   White band: exactly the carousel's enlarged photo as it renders - top
//   at the portal's top (anchor bottom - anchor height * scale, see
//   positionDesignCarousels), bottom at the photos' bottom (anchor bottom
//   minus the row's padding-bottom).
//   #B3B3B3 band: from there down to the bottom of the project's title.
// A gallery section (Explorations & Other Works, Archive) gets one white band with the same
// left/right, from the top of its grid's first row to the bottom of its
// last - so it grows with the collection, and its empty cells show white.
function positionProjectBands(projectsEl, panelIndex, columnLeftX, containerLeft) {
  const blocks = projectsEl.querySelectorAll('.design-project');
  const carouselEl = document.querySelector('.design-carousel');
  const rowPadding = carouselEl ? parseFloat(getComputedStyle(carouselEl).paddingBottom) || 0 : 0;
  const grayLeftX = containerLeft + panelActiveLeft(panelIndex) + measureTitleWidth(panelEls[panelIndex]);
  const grayRightX = containerLeft + panelActiveRight(panelIndex);
  const left = Math.round(grayLeftX - columnLeftX);
  const width = Math.max(0, Math.round(grayRightX - grayLeftX));

  // A project's gray band height (carousel photos' bottom -> title bottom),
  // read from the blocks below - reused as-is by a project-style gallery.
  let captionHeight = null;
  const section = projectsEl.querySelector('.personal-photos');
  const placeGallery = () => {
    if (!section) return;
    const sectionTop = section.getBoundingClientRect().top;
    const gridRect = section.querySelector('.personal-photos-grid').getBoundingClientRect();
    const band = section.querySelector('.design-project-band.is-photos');
    band.style.left = left + 'px';
    band.style.width = width + 'px';
    band.style.top = Math.round(gridRect.top - sectionTop) + 'px';
    band.style.height = Math.round(gridRect.height) + 'px';
    // Project-style title: the exact same gray band as a project's, in the
    // same relation to its title - bottom on the title's bottom (which,
    // without a filter row, sizePersonalPhotos puts right on the grid's top,
    // the two bands' edges one and the same).
    const caption = section.querySelector('.design-project-band.is-caption');
    if (caption && captionHeight != null) {
      const titleBottom = Math.round(section.querySelector('.design-project-title').getBoundingClientRect().bottom - sectionTop);
      caption.style.left = left + 'px';
      caption.style.width = width + 'px';
      caption.style.top = (titleBottom - captionHeight) + 'px';
      caption.style.height = captionHeight + 'px';
    }
    // The Contact tab's left edge (contentOriginX - fixed to the open
    // layout), moved by however far this column currently sits from its
    // open-layout left (columnLeftX), so the mark rides the tab's slide.
    placeGalleryFilterMark(section,
      contentOriginX() + projectsEl.getBoundingClientRect().left - columnLeftX);
  };
  blocks.forEach(block => {
    const blockTop = block.getBoundingClientRect().top;
    const anchorRect = block.querySelector('.design-carousel-anchor').getBoundingClientRect();
    const titleBottom = block.querySelector('.design-project-title').getBoundingClientRect().bottom;
    const whiteTop = Math.round(anchorRect.bottom - anchorRect.height * CAROUSEL_THUMB_HOVER_SCALE - blockTop);
    const seam = Math.round(anchorRect.bottom - rowPadding - blockTop);
    const grayBottom = Math.round(titleBottom - blockTop);
    const white = block.querySelector('.design-project-band.is-photos');
    const gray = block.querySelector('.design-project-band.is-caption');
    [white, gray].forEach(band => {
      band.style.left = left + 'px';
      band.style.width = width + 'px';
    });
    white.style.top = whiteTop + 'px';
    white.style.height = (seam - whiteTop) + 'px';
    gray.style.top = seam + 'px';
    gray.style.height = Math.max(0, grayBottom - seam) + 'px';
    if (captionHeight == null) captionHeight = Math.max(0, grayBottom - seam);
  });
  placeGallery();
}

// Keeps every project's carousel portal (the photo row) and its prev/next
// nav on its own anchor - which rides with its panel (positionDesignProjects)
// - on every frame, scroll and resize. Nothing here depends on which tab is
// open or whether the tabs are closing: a carousel is never hidden for being
// closed, and its internal step position (the portal's scrollLeft) is never
// touched, so a row the user stepped along keeps that offset while its tab
// opens, closes or slides aside. What's actually visible is decided only by
// where it physically is and the fixed layer order (its tab's
// .panel-content-layer, panelContentLayerZ) - a later tab's surface covers
// it, nothing else does.
//
// The portal spans the whole tabsContainer width (its only clip is the
// screen itself, plus the vertical crop explained below), and the row's
// padding-left puts its first photo at the anchor's x - so photos stepped
// out to the left of their column stay visible wherever no later tab covers
// them.
function positionDesignCarousels() {
  const containerRect = tabsContainer.getBoundingClientRect();
  const containerWidth = tabsContainer.clientWidth;
  designCarouselPortals.forEach(({ anchor, portal, nav }) => {
    const anchorRect = anchor.getBoundingClientRect();
    const track = portal.firstChild;
    portal.style.left = '0px';
    portal.style.width = containerWidth + 'px';
    // Scaled up (not just the anchor's own height) so the current thumb has
    // room to grow upward - see .design-carousel-thumb.is-current. Anchored
    // so the portal's own BOTTOM edge lands at anchorRect.bottom -
    // .design-carousel itself sits flush against that same bottom edge (see
    // its own position:absolute/bottom:0 in CSS), so every thumb's bottom -
    // current one included - lines up at the same y.
    const grownHeight = Math.round((anchorRect.height || CAROUSEL_THUMB_SIZE) * CAROUSEL_THUMB_HOVER_SCALE);
    portal.style.top = Math.round(anchorRect.bottom - containerRect.top - grownHeight) + 'px';
    portal.style.height = grownHeight + 'px';
    // Real photos' height in the row (.has-image thumbs): exactly what,
    // once enlarged, fills the portal's visible height above the row's
    // bottom padding - so the enlarged photo is never cropped.
    if (track) {
      const rowPadding = parseFloat(getComputedStyle(track).paddingBottom) || 0;
      portal.style.setProperty('--carousel-photo-height', ((grownHeight - rowPadding) / CAROUSEL_THUMB_HOVER_SCALE) + 'px');
    }
    if (track) track.style.paddingLeft = Math.round(anchorRect.left - containerRect.left) + 'px';
    // Pinned under the first photo slot (the anchor's own left/bottom), not
    // the row - so it never moves as the row steps sideways.
    nav.style.left = Math.round(anchorRect.left - containerRect.left) + 'px';
    nav.style.top = Math.round(anchorRect.bottom - containerRect.top) + 'px';
  });
}

// A photo/title click that isn't the end of a drag: pointer movement past
// CLICK_DRAG_THRESHOLD px between press and release cancels the click, so a
// drag or swipe that starts on a photo never opens its project.
const CLICK_DRAG_THRESHOLD = 6;
function onClickWithoutDrag(el, handler) {
  let start = null;
  el.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY }; });
  el.addEventListener('click', e => {
    const moved = start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > CLICK_DRAG_THRESHOLD;
    start = null;
    if (!moved) handler(e);
  });
}

// Simple click-and-drag horizontal scroll for a carousel, since a native
// overflow-x:auto strip otherwise only responds to shift+wheel or a
// touch/trackpad swipe, not a plain mouse drag.
function makeCarouselDraggable(el) {
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  el._didDrag = false;

  el.addEventListener('pointerdown', e => {
    dragging = true;
    el._didDrag = false;
    startX = e.clientX;
    startScroll = el.scrollLeft;
    el.classList.add('is-dragging');
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) el._didDrag = true;
    // Snapped to the same grid the tab-panel slide moves on (snapToTabsGrid),
    // so a drag jumps in the same rasterized steps instead of tracking the
    // pointer pixel-for-pixel.
    el.scrollLeft = snapToTabsGrid(startScroll - dx);
  });
  function stopDrag() {
    dragging = false;
    el.classList.remove('is-dragging');
  }
  el.addEventListener('pointerup', stopDrag);
  el.addEventListener('pointerleave', stopDrag);
  el.addEventListener('pointercancel', stopDrag);
}

// The site's one navigation control (.nav-control in style.css): a
// carousel's prev/next and the open project's prev/next/close all share its
// glyphs, size and orange hover - only their class (color, position) and
// action differ (symbols: NAV_CONTROL_TYPES, above). A click runs the
// action and goes no further, so it never reaches a close-on-background
// surface, a tab or the landing.
function createNavControl(type, className, action) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `nav-control ${className}`;
  btn.textContent = NAV_CONTROL_TYPES[type].symbol;
  btn.setAttribute('aria-label', NAV_CONTROL_TYPES[type].label);
  btn.addEventListener('click', e => {
    e.stopPropagation();
    action();
  });
  return btn;
}

// Project detail view: a full-screen tinted backdrop, a big-image viewer
// over the top ~75% of the screen (for the image/arrows only - no
// background of its own, the backdrop shows through it), and a black drawer
// over the bottom quarter with a small preview carousel (top) plus two text
// columns (bottom). All three are reused across every project - only their
// content swaps per open() call.

// Full-screen tint, sitting under the (opaque, black) drawer so the drawer
// itself is unaffected by it.
const designPhotoBackdrop = document.createElement('div');
designPhotoBackdrop.className = 'design-photo-backdrop';
document.body.appendChild(designPhotoBackdrop);

// The big viewer, shown above the drawer.
const designPhotoViewer = document.createElement('div');
designPhotoViewer.className = 'design-photo-viewer';
// Holds every photo element in the fanned-out stack - see layoutPhotoStack.
// Clipped so an off-screen (not-yet-revealed) one never pokes out past it.
const designPhotoViewerStage = document.createElement('div');
designPhotoViewerStage.className = 'design-photo-viewer-stage';
designPhotoViewer.appendChild(designPhotoViewerStage);
document.body.appendChild(designPhotoViewer);

// The drawer itself: preview strip on top, two text columns below.
const designPhotoDrawer = document.createElement('div');
designPhotoDrawer.className = 'design-photo-drawer';
const designPhotoDrawerTrack = document.createElement('div');
designPhotoDrawerTrack.className = 'design-photo-drawer-track';
const designPhotoDrawerColumns = document.createElement('div');
designPhotoDrawerColumns.className = 'design-photo-drawer-columns';
const designPhotoDrawerColumn1 = document.createElement('div');
designPhotoDrawerColumn1.className = 'design-photo-drawer-column';
const designPhotoDrawerTitleRow = document.createElement('div');
designPhotoDrawerTitleRow.className = 'design-photo-drawer-title-row';
const designPhotoDrawerTitle = document.createElement('span');
// Also a .design-project-title, filled with the same per-letter grid-char
// spans (see setDrawerTitle) - so it's typographically identical to the
// project's title in its tab: same font, size, cells, lowercase.
designPhotoDrawerTitle.className = 'design-photo-drawer-title design-project-title';
designPhotoDrawerTitleRow.appendChild(designPhotoDrawerTitle);
// A project's optional credit (project.credit), right after the title on
// the same line - see .design-photo-drawer-credit.
const designPhotoDrawerCredit = document.createElement('span');
designPhotoDrawerCredit.className = 'design-photo-drawer-credit';
designPhotoDrawerTitleRow.appendChild(designPhotoDrawerCredit);

// Same per-letter build as a project's title in buildDesignProjects. The
// letters are lowercased here, on the displayed title only (the project
// data is untouched) - the tab titles read lowercase too.
function setDrawerTitle(text) {
  designPhotoDrawerTitle.textContent = '';
  text.toLowerCase().split('').forEach(ch => {
    const charEl = document.createElement('span');
    charEl.className = 'tab-title-char grid-char';
    charEl.textContent = ch;
    designPhotoDrawerTitle.appendChild(charEl);
  });
}

// Moves description columns 2 and 3 as one block - their widths and the
// DESIGN_DRAWER_COLUMN_GAP between them untouched - so column 3's right
// edge sits exactly where the Photography tab begins: its left edge while
// closed to the right of an open Design (computeTargets' right-hand group),
// the same point for every project. Positions are relative to the columns
// container, whose left is the opened project's title x.
let drawerTitleLeftX = 0;
function positionDrawerDescriptionColumns() {
  const photoIndex = PANELS.findIndex(p => p.id === 'photography');
  const photographyTabX = tabsContainer.getBoundingClientRect().left + tabsContainer.clientWidth -
    (panelEls.length - photoIndex) * computeOverlapStep();
  const column2Width = designPhotoDrawerColumn2.getBoundingClientRect().width;
  const column3Width = designPhotoDrawerColumn3.getBoundingClientRect().width;
  const column2LeftX = photographyTabX - column3Width - DESIGN_DRAWER_COLUMN_GAP - column2Width;
  designPhotoDrawerColumn2.style.left = Math.round(column2LeftX - drawerTitleLeftX) + 'px';
  designPhotoDrawerColumn3.style.left = Math.round(column2LeftX + column2Width + DESIGN_DRAWER_COLUMN_GAP - drawerTitleLeftX) + 'px';
  alignDrawerCredit();
}

// A project's credit (.design-photo-drawer-credit) stays on its title's line
// but is pushed right - by its own margin, so the title never moves - until
// its right edge meets the right description column's (column 3, just
// placed above).
function alignDrawerCredit() {
  const credit = designPhotoDrawerCredit;
  credit.style.marginLeft = '';
  if (!credit.textContent) return;
  const shift = designPhotoDrawerColumn3.getBoundingClientRect().right - credit.getBoundingClientRect().right;
  credit.style.marginLeft = Math.max(0, Math.round(shift)) + 'px';
}
// Fills the two description columns (2 then 3) at their own fixed size and
// typography: the text starts in column 2 and, only if it runs past that
// column's height, continues in column 3 from the first word that didn't
// fit - one reading order, never duplicated, the drawer never resized.
// "Fits" means ending no lower than the format line in column 1 (the
// project's label on the left), nor past the column's own bottom.
// An optional link ({ label, href }) takes its own last line right after the
// text, in whichever column the text ends in - if it wouldn't fit under
// all of it in column 2, the text's tail moves on to column 3 so the link
// still follows it there. A description (with no link) that fits in column
// 2 alone keeps the earlier placeholder treatment (the same text mirrored
// in column 3). Call once both columns have their final top/left.
// Optional inline links ([{ text, href }]) turn just those words of the text
// into links, wherever the split between columns puts them. An optional
// heading ({ title, type } - a studies item's) opens the first line: the
// title bold, the type regular, then the text from the next line - and is
// never mirrored into column 3.
let drawerDescriptionText = '';
let drawerDescriptionLink = null;
let drawerDescriptionInlineLinks = [];
let drawerDescriptionHeading = null;
function flowDrawerDescription(text, link, inlineLinks, heading) {
  drawerDescriptionText = text;
  drawerDescriptionLink = link || null;
  drawerDescriptionInlineLinks = inlineLinks || [];
  drawerDescriptionHeading = heading || null;
  const col2 = designPhotoDrawerColumn2;
  const col3 = designPhotoDrawerColumn3;
  // ...and never within one text line (--project-detail-line, resolved here
  // as the format line's own line-height) of the drawer's bottom edge - its
  // least air below the text.
  const limitBottom = Math.min(
    designPhotoDrawerFormat.getBoundingClientRect().bottom,
    designPhotoDrawer.getBoundingClientRect().bottom - parseFloat(getComputedStyle(designPhotoDrawerFormat).lineHeight)
  );
  // The text's own bottom edge (its last line), not the column box's.
  const range = document.createRange();
  const fits = col => {
    if (col.scrollHeight > col.clientHeight) return false;
    range.selectNodeContents(col);
    return range.getBoundingClientRect().bottom <= limitBottom + 1;
  };
  // Sets a column to some words, plus the link when withLink: on its own
  // last line, or - withLink 'inline', when that line doesn't fit - at the
  // right end of the text's last line.
  const fill = (col, words, withLink) => {
    col.textContent = '';
    appendDrawerWords(col, words);
    if (withLink && drawerDescriptionLink) {
      col.appendChild(buildDrawerLinkLine(drawerDescriptionLink, withLink === 'inline'));
    }
  };
  const words = drawerHeadingWords(drawerDescriptionHeading)
    .concat(drawerDescriptionWords(text, drawerDescriptionInlineLinks));
  col3.textContent = '';
  fill(col2, words, true);
  if (fits(col2)) {
    if (!drawerDescriptionLink && !drawerDescriptionHeading) fill(col3, words, false);
    return;
  }
  // Largest word count that still fits in column 2 (binary search) - one
  // word fewer than everything at most, so with a link there is always text
  // continuing into column 3 for the link to follow.
  let lo = 0;
  let hi = drawerDescriptionLink ? words.length - 1 : words.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    fill(col2, words.slice(0, mid), false);
    if (fits(col2)) lo = mid;
    else hi = mid - 1;
  }
  fill(col2, words.slice(0, lo), false);
  fill(col3, words.slice(lo), true);
  if (drawerDescriptionLink && !fits(col3)) fill(col3, words.slice(lo), 'inline');
}

// The text's words, each as { word, href } - href set when it overlaps one
// of the inline links' phrases (first occurrence), null otherwise. Only the
// overlapping part is linked: whatever of the word lies outside the phrase
// (punctuation - "Avenir," or "manifesto.") is kept as its lead/tail.
function drawerDescriptionWords(text, inlineLinks) {
  if (!text) return [];
  const spans = inlineLinks
    .map(link => ({ start: text.indexOf(link.text), end: text.indexOf(link.text) + link.text.length, href: link.href }))
    .filter(span => span.start >= 0);
  let offset = 0;
  return text.split(' ').map(word => {
    const start = offset;
    const end = start + word.length;
    offset = end + 1;
    const span = spans.find(s => start < s.end && end > s.start);
    if (!span) return { word, href: null };
    const from = Math.max(span.start, start) - start;
    const to = Math.min(span.end, end) - start;
    return { word: word.slice(from, to), href: span.href, lead: word.slice(0, from), tail: word.slice(to) };
  });
}

// A heading's words, in the same shape: the title's marked bold, the type's
// plain, then a line break ({ br }) so the text starts on the next line.
function drawerHeadingWords(heading) {
  if (!heading) return [];
  const words = [];
  if (heading.title) heading.title.split(' ').forEach(word => words.push({ word, href: null, bold: true }));
  if (heading.type) heading.type.split(' ').forEach(word => words.push({ word, href: null }));
  words.push({ br: true });
  return words;
}

// Appends words to a column as plain text, consecutive words of one inline
// link grouped into a single <a> (so the space between them is linked too,
// the spaces around it aren't), and of a heading's title into one bold span.
// Same typography as the text - see .design-photo-drawer-inline-link and
// .design-photo-drawer-heading. A { br } entry is a line break, with no
// space on either side of it.
function appendDrawerWords(col, words) {
  const runs = [];
  words.forEach(entry => {
    const last = runs[runs.length - 1];
    const styled = entry.href || entry.bold;
    // A link's lead/tail punctuation ends its run (it sits outside the <a>).
    if (last && !entry.br && !last.br && styled && last.href === entry.href && !!last.bold === !!entry.bold && !last.tail && !entry.lead) {
      last.words.push(entry.word);
      last.tail = entry.tail;
    } else {
      runs.push({ href: entry.href, bold: entry.bold, br: entry.br, lead: entry.lead, tail: entry.tail, words: [entry.word] });
    }
  });
  runs.forEach((run, i) => {
    if (run.br) {
      col.appendChild(document.createElement('br'));
      return;
    }
    if (i > 0 && !runs[i - 1].br) col.appendChild(document.createTextNode(' '));
    const text = run.words.join(' ');
    if (run.bold) {
      const strong = document.createElement('strong');
      strong.className = 'design-photo-drawer-heading';
      strong.textContent = text;
      col.appendChild(strong);
      return;
    }
    if (!run.href) {
      col.appendChild(document.createTextNode(text));
      return;
    }
    const a = document.createElement('a');
    a.className = 'design-photo-drawer-inline-link';
    a.href = run.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = text;
    a.addEventListener('click', e => e.stopPropagation());
    if (run.lead) col.appendChild(document.createTextNode(run.lead));
    col.appendChild(a);
    if (run.tail) col.appendChild(document.createTextNode(run.tail));
  });
}

// The link's own last line (right-aligned - see .design-photo-drawer-link-line),
// or, inline, a right float sharing the text's last line.
// Its click only opens the link, in a new tab: never closes the project or
// reaches the photos/background handlers.
function buildDrawerLinkLine(link, inline) {
  const line = document.createElement(inline ? 'span' : 'div');
  line.className = 'design-photo-drawer-link-line' + (inline ? ' is-inline' : '');
  const a = document.createElement('a');
  a.className = 'design-photo-drawer-link';
  a.href = link.href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.textContent = link.label;
  a.addEventListener('click', e => e.stopPropagation());
  line.appendChild(a);
  return line;
}

// Location line right under the title row - "{year}. {city, country}", all
// in the location's own typography (no special year treatment anymore).
const designPhotoDrawerLocation = document.createElement('div');
designPhotoDrawerLocation.className = 'design-photo-drawer-location';
// Format line, two lines further down (margin-top in CSS) - placeholder
// text for now, real copy later.
const designPhotoDrawerFormat = document.createElement('div');
designPhotoDrawerFormat.className = 'design-photo-drawer-format';
designPhotoDrawerColumn1.appendChild(designPhotoDrawerTitleRow);
designPhotoDrawerColumn1.appendChild(designPhotoDrawerLocation);
designPhotoDrawerColumn1.appendChild(designPhotoDrawerFormat);
const designPhotoDrawerColumn2 = document.createElement('div');
designPhotoDrawerColumn2.className = 'design-photo-drawer-column design-photo-drawer-column-wide';
// A third, identical placeholder paragraph, DESIGN_DRAWER_COLUMN_GAP px to
// column2's own right.
const designPhotoDrawerColumn3 = document.createElement('div');
designPhotoDrawerColumn3.className = 'design-photo-drawer-column design-photo-drawer-column-wide';
designPhotoDrawerColumns.appendChild(designPhotoDrawerColumn1);
designPhotoDrawerColumns.appendChild(designPhotoDrawerColumn2);
designPhotoDrawerColumns.appendChild(designPhotoDrawerColumn3);
// Prev/next step through the open project (stepDesignPhoto - circular, the
// same path as the arrow keys and, via showDrawerPhotoAtIndex, the preview
// thumbs and the peeking photos); close is the background's own
// closeDesignPhotoDrawer. Placed by positionDrawerControls.
const designPhotoDrawerPrev = createNavControl('prev', 'design-photo-drawer-control', () => stepDesignPhoto(-1));
const designPhotoDrawerNext = createNavControl('next', 'design-photo-drawer-control', () => stepDesignPhoto(1));
const designPhotoDrawerClose = createNavControl('close', 'design-photo-drawer-control', () => closeDesignPhotoDrawer());
designPhotoDrawer.appendChild(designPhotoDrawerTrack);
designPhotoDrawer.appendChild(designPhotoDrawerColumns);
designPhotoDrawer.appendChild(designPhotoDrawerPrev);
designPhotoDrawer.appendChild(designPhotoDrawerNext);
designPhotoDrawer.appendChild(designPhotoDrawerClose);
document.body.appendChild(designPhotoDrawer);
makeCarouselDraggable(designPhotoDrawerTrack);

// How far below its box's middle a nav control's glyph actually sits once
// drawn (px, at its .nav-control scale): ‹ › ride low in their line box, so
// the box's middle isn't where the arrow reads. From the font's own metrics
// - the ink's top/bottom around the baseline, and the baseline's place in a
// line-height:1 box.
let navControlInkCanvas = null;
function navControlInkOffset(btn) {
  const cs = getComputedStyle(btn);
  if (!navControlInkCanvas) navControlInkCanvas = document.createElement('canvas').getContext('2d');
  const ctx = navControlInkCanvas;
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = ctx.measureText(btn.textContent);
  const boxHeight = btn.offsetHeight;
  const baseline = (boxHeight - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
  const inkCenter = baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  const scale = btn.getBoundingClientRect().height / boxHeight;
  return (inkCenter - boxHeight / 2) * scale;
}

// The drawer's controls, from the live geometry (drawer coordinates, so its
// slide doesn't matter): all three on the preview strip's own (unshifted)
// middle; the arrows one strip gap (the thumbs' own gap) outside the first
// and last thumb; the X DRAWER_CLOSE_INSET px in from the screen's right
// edge (the drawer spans the full width), on the arrows' line. The arrows'
// edges are their visible ones - .nav-control's scale grows them around
// their center, which the rects below already include - and they stay on
// screen if the strip is wider than it. Then the strip itself - as one
// unit, a translateY only, so its x, the thumbs and the drawer's flow (the
// text columns) don't move - comes down until its middle meets the arrows'
// drawn middle (navControlInkOffset).
const DRAWER_CLOSE_INSET = 16;
function positionDrawerControls() {
  const first = currentDrawerThumbs[0];
  const last = currentDrawerThumbs[currentDrawerThumbs.length - 1];
  if (!first) return;
  const drawerRect = designPhotoDrawer.getBoundingClientRect();
  const firstRect = first.getBoundingClientRect();
  const lastRect = last.getBoundingClientRect();
  // Layout offsets, not rects: the strip's own shift below never feeds back.
  const centerY = designPhotoDrawerTrack.offsetTop + designPhotoDrawerTrack.offsetHeight / 2;
  const gap = parseFloat(getComputedStyle(designPhotoDrawerTrack).columnGap) || 0;
  const place = (btn, visibleLeft) => {
    const visibleWidth = btn.getBoundingClientRect().width;
    const x = Math.max(0, Math.min(drawerRect.width - visibleWidth, visibleLeft - drawerRect.left));
    btn.style.left = Math.round(x + (visibleWidth - btn.offsetWidth) / 2) + 'px';
    btn.style.top = Math.round(centerY - btn.offsetHeight / 2) + 'px';
  };
  place(designPhotoDrawerPrev, firstRect.left - gap - designPhotoDrawerPrev.getBoundingClientRect().width);
  place(designPhotoDrawerNext, lastRect.right + gap);
  designPhotoDrawerClose.style.left =
    Math.round(drawerRect.width - DRAWER_CLOSE_INSET - designPhotoDrawerClose.offsetWidth) + 'px';
  designPhotoDrawerClose.style.top = Math.round(centerY - designPhotoDrawerClose.offsetHeight / 2) + 'px';
  designPhotoDrawerTrack.style.transform =
    `translateY(${Math.round(navControlInkOffset(designPhotoDrawerPrev))}px)`;
}
// A dragged strip carries its first/last thumb along - the arrows follow.
designPhotoDrawerTrack.addEventListener('scroll', positionDrawerControls, { passive: true });
// The glyph metrics depend on the loaded font.
document.fonts.ready.then(positionDrawerControls);

// Every subsequent revealed photo peeks this many px past the one before it
// - the same sliver idea as the tab system's own overlapStep, just a fixed
// pixel amount here instead of a char count.
const DESIGN_PHOTO_STACK_OFFSET = 30;

let currentDrawerPhotos = [];
let currentDrawerIndex = 0;
let currentDrawerThumbs = [];
// The project (or collection) the drawer currently shows.
let currentDrawerProject = null;
let designPhotoViewerEls = [];

// The drawer travels its own full height (100% translateY to 0). Quantizing
// that distance into --tabs-grid-step-sized jumps gives it the same
// pixelated, stepped feel as the tab-panel slide and the marquee scroll.
function positionDesignPhotoDrawer() {
  const travel = designPhotoDrawer.getBoundingClientRect().height;
  const gridStep = readPx('--tabs-grid-step', 22);
  const steps = Math.max(1, Math.round(travel / gridStep));
  designPhotoDrawer.style.transitionTimingFunction = `steps(${steps}, end)`;
}

// Every photo element persists for the whole viewing session (all created
// upfront in openDesignPhotoDrawer) and is just repositioned here, exactly
// like computeTargets repositions every tab panel on every call: the current
// photo sits centered on screen, the ones before it stack out to its left
// (photoStackTargets), later ones sit off past the screen's right edge
// (their own left edge exactly touching it) until their turn comes.
// Shared by every project (Design, Photography, the personal collection -
// anything opened through openDesignPhotoDrawer), whatever its photos'
// sizes: every photo moves from where it is to its target on the tabs' own
// stepped clock and grid (runSteppedAnimation with snapToGrid - the
// tab-panel slide's exact motion), all started together here - so the new
// photo's entrance and the stack's rearrangement are one synchronized
// transition, forward and back - and every frame re-derives which photos lie
// under another from those same painted positions (updatePhotoStackDepth).
function layoutPhotoStack() {
  const stageLeft = designPhotoViewerStage.getBoundingClientRect().left;
  const offscreenX = window.innerWidth - stageLeft;
  const stackX = photoStackTargets();
  designPhotoViewerEls.forEach((el, i) => {
    const target = i <= currentDrawerIndex ? stackX[i] : offscreenX;
    el.style.zIndex = i + 1;
    el.dataset.x = target;
    const from = parseFloat(el.dataset.paintedX || '0');
    if (from === target) return;
    runSteppedAnimation(el, '_stackAnimFrame', from, target, TABS_DURATION_MS,
      v => setPhotoStackX(el, v), { snapToGrid: true, onFrame: updatePhotoStackDepth });
  });
  // Also right away, for the photos that aren't moving at all.
  updatePhotoStackDepth();
}

// Where the current photo and every photo before it land (px, from the
// stage's left), derived only from which photo is current - never
// accumulated, so going forward and back always lands on exactly the same
// composition. The current photo is the anchor: centered on the screen by
// its own rendered width, however many photos came before it. Then, from it
// backwards, each photo is placed relative to the final position of the one
// right on top of it: DESIGN_PHOTO_STACK_OFFSET further left (the usual
// left margin of the one underneath) - unless that would let its right edge
// pass the right edge of the one on top (a wider photo underneath), in which
// case it goes further left, just enough for both right edges to line up.
// Photos keep their real sizes and are never masked or cropped; only where
// they stop changes.
function photoStackTargets() {
  const stageLeft = designPhotoViewerStage.getBoundingClientRect().left;
  const centerX = window.innerWidth / 2 - stageLeft;
  const xs = [];
  const current = designPhotoViewerEls[currentDrawerIndex];
  if (!current) return xs;
  xs[currentDrawerIndex] = Math.round(centerX - current.offsetWidth / 2);
  for (let i = currentDrawerIndex - 1; i >= 0; i--) {
    const upperX = xs[i + 1];
    const upperRight = upperX + designPhotoViewerEls[i + 1].offsetWidth;
    const width = designPhotoViewerEls[i].offsetWidth;
    xs[i] = Math.min(upperX - DESIGN_PHOTO_STACK_OFFSET, upperRight - width);
  }
  return xs;
}

// A photo/video normally fills the stage's height at its own aspect ratio.
// One that would then run wider than the screen (less the stack's margin
// on each side) is scaled down proportionally to that width instead, and
// centered vertically in the stage - never cropped or distorted. Re-run on
// resize; photoStackTargets then reads the resulting widths.
function fitViewerMedia() {
  const stageHeight = designPhotoViewerStage.clientHeight;
  const maxWidth = window.innerWidth - 2 * DESIGN_PHOTO_STACK_OFFSET;
  designPhotoViewerEls.forEach(el => {
    const media = el._media;
    if (!media) return;
    const ratio = media.w / media.h;
    if (stageHeight * ratio > maxWidth) {
      const height = Math.round(maxWidth / ratio);
      el.style.width = Math.round(maxWidth) + 'px';
      el.style.height = height + 'px';
      el.style.top = Math.round((stageHeight - height) / 2) + 'px';
      el.style.bottom = 'auto';
    } else {
      el.style.width = el.style.height = el.style.top = el.style.bottom = '';
    }
  });
}

// Paints a stacked photo at x (px, from the stage's left) and remembers it
// - the position everything else (the next animation's start, the depth
// check below) reads, so both always agree with what's on screen.
function setPhotoStackX(el, x) {
  el.style.transform = `translateX(${Math.round(x)}px)`;
  el.dataset.paintedX = Math.round(x);
}

// Depth, from the photos' actual painted positions: a photo is "below"
// whenever any later (higher z - see layoutPhotoStack) photo physically
// overlaps it; the one on top never is. Below photos get the white
// under-layer (.is-below in CSS - the same veil the open-project backdrop
// lays over the page). Recomputed on every animation frame, so a photo
// takes the veil the moment another slides over it and loses it the moment
// it's uncovered - never before, never after.
// Photos still parked off past the screen's right edge (not yet revealed)
// are out of the picture: they cover nothing and carry no veil - otherwise
// a photo sliding in would count as "under" the parked ones it starts next
// to, and travel veiled until it cleared them. Photos are never masked or
// cropped here - a lower photo stays whole under the one in front, which
// is placed so it never lets it show on the right (photoStackTargets).
function updatePhotoStackDepth() {
  const offscreenX = window.innerWidth - designPhotoViewerStage.getBoundingClientRect().left;
  const boxes = designPhotoViewerEls.map(el => {
    const x = parseFloat(el.dataset.paintedX || '0');
    return { left: x, right: x + el.offsetWidth, onStage: x < offscreenX };
  });
  designPhotoViewerEls.forEach((el, i) => {
    const me = boxes[i];
    const covered = me.onStage && boxes.some((b, j) => j > i && b.onStage && b.left < me.right && b.right > me.left);
    el.classList.toggle('is-below', covered);
  });
}

function showDrawerPhotoAtIndex(newIndex) {
  currentDrawerIndex = newIndex;
  layoutPhotoStack();
  currentDrawerThumbs.forEach((thumb, i) => {
    thumb.classList.toggle('is-active', i === currentDrawerIndex);
  });
  if (currentDrawerProject && currentDrawerProject.itemInfo) fillDrawerText(currentDrawerProject, currentDrawerIndex);
}

// The open view's year line and description for one item: the project's own
// - or, in a collection with per-item info (itemInfo, the studies gallery),
// that item's info: its year, and "**title** type" opening its description.
// An item without info gets neither.
function drawerTextFor(project, index) {
  if (!project.itemInfo) {
    return {
      locationLine: project.locationLine || [project.year, project.location].filter(Boolean).join('. '),
      description: project.description || '',
      link: project.link,
      inlineLinks: project.inlineLinks
    };
  }
  const item = (project.images || [])[index];
  const info = item && item.info;
  if (!info) return { locationLine: '', description: '' };
  return {
    locationLine: info.year || '',
    description: info.description || '',
    inlineLinks: info.inlineLinks,
    heading: { title: info.title, type: info.type }
  };
}

function fillDrawerText(project, index) {
  const text = drawerTextFor(project, index);
  designPhotoDrawerLocation.textContent = text.locationLine;
  flowDrawerDescription(text.description, text.link, text.inlineLinks, text.heading);
}

// Direct selection (a preview thumb, or a big photo peeking out of the
// stack): photo 2 -> photo 7, say, makes 7 current right away and moves the
// whole stack from its current composition straight to the new one in a
// single layoutPhotoStack pass - every photo on the same stepped clock and
// grid as an arrow step, so a long jump takes exactly as long as a short one.
function goToDrawerPhoto(targetIndex) {
  if (targetIndex === currentDrawerIndex) return;
  showDrawerPhotoAtIndex(targetIndex);
}

function stepDesignPhoto(delta) {
  if (!currentDrawerPhotos.length) return;
  const newIndex = (currentDrawerIndex + delta + currentDrawerPhotos.length) % currentDrawerPhotos.length;
  showDrawerPhotoAtIndex(newIndex);
}

window.addEventListener('keydown', e => {
  if (!designPhotoDrawer.classList.contains('is-open')) return;
  if (e.key === 'ArrowLeft') stepDesignPhoto(-1);
  else if (e.key === 'ArrowRight') stepDesignPhoto(1);
  else if (e.key === 'Escape') closeDesignPhotoDrawer();
});

// Clicking the empty background itself - left or right of the photos, or
// the drawer's own empty space - closes back to the tab underneath. Only
// these bare surfaces count (the event's own target, never a descendant):
// the photos, the arrows, the preview thumbs/strip and the text columns all
// keep their own behavior. The stage is included because it spans empty
// space beside the photos, not the photos themselves.
const DESIGN_PHOTO_CLOSE_SURFACES = [
  designPhotoBackdrop, designPhotoViewer, designPhotoViewerStage, designPhotoDrawer, designPhotoDrawerColumns
];
[designPhotoBackdrop, designPhotoViewer, designPhotoDrawer].forEach(el => {
  el.addEventListener('click', e => {
    if (DESIGN_PHOTO_CLOSE_SURFACES.includes(e.target)) closeDesignPhotoDrawer();
  });
});

// project: the DESIGN_PROJECTS entry being opened - supplies its own
// title/year/location/format/description, so each project's drawer reads
// distinctly instead of sharing one global placeholder. titleLeftX: viewport
// x of the title in the project block (measured live by the caller) - the
// left column starts there; the two description columns are placed by
// positionDrawerDescriptionColumns.
function openDesignPhotoDrawer(project, startLabel, titleLeftX) {
  const photos = project.photos;
  // Clear any leftover photo elements from a previous project's viewing
  // session (stopping any move still under way), so this one's fan-out
  // starts from a clean, empty stage.
  designPhotoViewerEls.forEach(el => { if (el._stackAnimFrame) cancelAnimationFrame(el._stackAnimFrame); });
  designPhotoViewerStage.querySelectorAll('video').forEach(v => projectVideoObserver.unobserve(v));
  designPhotoViewerStage.textContent = '';

  currentDrawerPhotos = photos;
  currentDrawerIndex = startLabel ? Math.max(0, photos.indexOf(startLabel)) : 0;

  // Every photo gets a persistent element up front, all starting parked
  // with their own left edge exactly touching the screen's right edge
  // (placed directly - not animated) - layoutPhotoStack() then slides in
  // however many of them (0..currentDrawerIndex) are revealed.
  const stageLeft = designPhotoViewerStage.getBoundingClientRect().left;
  const offscreenX = window.innerWidth - stageLeft;
  const images = project.images || [];
  designPhotoViewerEls = photos.map((label, i) => {
    const el = document.createElement('div');
    el.className = 'design-photo-viewer-image';
    const image = images[i];
    if (image) {
      // A real photo: the stage's full height, its own width from its own
      // aspect ratio - not the placeholder's 4:3 box (see .has-image in CSS).
      el.classList.add('has-image');
      el.style.aspectRatio = `${image.w} / ${image.h}`;
      el._media = image;
      el.appendChild(createProjectImage(image, project.title));
    } else {
      el.textContent = label;
    }
    setPhotoStackX(el, offscreenX);
    el.dataset.x = offscreenX;
    // Clicking any photo in the fanned-out stack - including one only
    // peeking out behind the current one - jumps straight to it. Clicking
    // the current one does nothing, and never reaches the close-on-
    // background handlers below.
    el.addEventListener('click', e => {
      e.stopPropagation();
      goToDrawerPhoto(i);
    });
    designPhotoViewerStage.appendChild(el);
    return el;
  });
  designPhotoDrawerTrack.textContent = '';
  currentDrawerThumbs = photos.map((label, i) => {
    const item = document.createElement('div');
    item.className = 'design-photo-drawer-item';
    const image = images[i];
    if (image) {
      item.classList.add('has-image');
      item.style.aspectRatio = `${image.w} / ${image.h}`;
      item.appendChild(createProjectImage(image, project.title, { still: true }));
    } else {
      item.textContent = label;
    }
    item.addEventListener('click', e => {
      e.stopPropagation();
      if (designPhotoDrawerTrack._didDrag) return;
      goToDrawerPhoto(i);
    });
    designPhotoDrawerTrack.appendChild(item);
    return item;
  });
  designPhotoDrawerTrack.scrollLeft = 0;
  fitViewerMedia();

  setDrawerTitle(project.openTitle || project.title);
  designPhotoDrawerCredit.textContent = project.credit || '';
  // A personal-photos collection (PERSONAL_PHOTOS_BY_PANEL) has only a
  // title - its missing fields just render empty (the studies gallery's
  // year/description come from its current item - see drawerTextFor).
  currentDrawerProject = project;
  const drawerText = drawerTextFor(project, currentDrawerIndex);
  designPhotoDrawerLocation.textContent = drawerText.locationLine;
  designPhotoDrawerFormat.textContent = project.format || '';
  designPhotoDrawerColumns.style.left = Math.round(titleLeftX) + 'px';
  designPhotoDrawerColumn1.style.left = -DESIGN_DRAWER_COLUMN1_LEFT_SHIFT + 'px';
  drawerTitleLeftX = titleLeftX;
  positionDrawerDescriptionColumns();
  // Column2's first line should start level with column1's location line
  // (the one with the year/city), not with its title above that.
  const columnsRect = designPhotoDrawerColumns.getBoundingClientRect();
  const locationRect = designPhotoDrawerLocation.getBoundingClientRect();
  const column2Top = Math.round(locationRect.top - columnsRect.top);
  designPhotoDrawerColumn2.style.top = column2Top + 'px';
  designPhotoDrawerColumn3.style.top = column2Top + 'px';
  flowDrawerDescription(drawerText.description, drawerText.link, drawerText.inlineLinks, drawerText.heading);
  positionDrawerControls();

  // The entrance: the revealed photos slide in from their parked spot on the
  // stepped clock (layoutPhotoStack) - a JS animation, so no frame dance is
  // needed to keep it from being coalesced away.
  showDrawerPhotoAtIndex(currentDrawerIndex);
  designPhotoDrawer.classList.add('is-open');
  designPhotoViewer.classList.add('is-open');
  designPhotoBackdrop.classList.add('is-open');
}

function closeDesignPhotoDrawer() {
  // The viewer only fades out (still "on screen" to the video observer), so
  // its videos are stopped here - and dropped from the observer, since the
  // next open rebuilds them anyway.
  designPhotoViewerStage.querySelectorAll('video').forEach(v => {
    projectVideoObserver.unobserve(v);
    v.pause();
  });
  designPhotoDrawer.classList.remove('is-open');
  designPhotoViewer.classList.remove('is-open');
  designPhotoBackdrop.classList.remove('is-open');
}

function toggleDesignPhotoDrawer(project, titleLeftX) {
  if (designPhotoDrawer.classList.contains('is-open')) {
    closeDesignPhotoDrawer();
  } else {
    openDesignPhotoDrawer(project, null, titleLeftX);
  }
}

// Fills an About paragraph with its text, wrapping just the words
// "federico osatnik" (any case) in a span.tab-body-name - plain inline text
// in the same paragraph, only its typeface differs (see .tab-body-name).
const ABOUT_NAME_PATTERN = /federico osatnik/i;
function appendWithNameSpan(p, text) {
  const match = text.match(ABOUT_NAME_PATTERN);
  if (!match) {
    p.textContent = text;
    return;
  }
  p.appendChild(document.createTextNode(text.slice(0, match.index)));
  const name = document.createElement('span');
  name.className = 'tab-body-name';
  name.textContent = match[0];
  p.appendChild(name);
  p.appendChild(document.createTextNode(text.slice(match.index + match[0].length)));
}

function buildPanels() {
  PANELS.forEach((panel, i) => {
    const el = document.createElement('div');
    el.className = 'tab-panel';
    el.dataset.panel = panel.id;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-expanded', i === activeIndex ? 'true' : 'false');
    el.setAttribute('aria-label', panel.title);

    // The panel itself carries no background color of its own (see
    // .tab-color-block below for where this tab's one fixed rect color
    // shows) - every panel shows the same plain --tab-open-bg (style.css).
    // The title's own fixed color is set as a per-panel CSS custom property
    // here - .tab-title's "color: var(--tab-title-color)" rule (style.css)
    // picks it up, and every letter's border-bottom underline (currentColor)
    // matches it too, in every state - see TAB_ACCENT_COLORS.
    const palette = TAB_ACCENT_COLORS[panel.id];
    if (palette) el.style.setProperty('--tab-title-color', palette.title);

    const header = document.createElement('div');
    header.className = 'tab-header';
    const title = document.createElement('h2');
    title.className = 'tab-title';
    panel.title.split('').forEach(ch => {
      const charEl = document.createElement('span');
      charEl.className = 'tab-title-char grid-char';
      charEl.textContent = ch;
      title.appendChild(charEl);
    });
    header.appendChild(title);
    setupTabTitleChars(i, title);

    el.appendChild(header);

    // This tab's one fixed color, as a permanent block pinned to its own
    // panel's left edge, behind the title (z-index:-1, see style.css) -
    // never recolored on its own afterward (see selectPanel, which no
    // longer touches color at all); only its width is ever recomputed (on
    // resize - see positionTabColorBlocks), since it's derived from
    // --glyph-cell-size. Fixed at this title's own natural horizontal width
    // (measureTitleWidth - the same width the title itself would need open,
    // on one line) and never changes with open/closed state - the panel's
    // own overflow:hidden is what reveals only part of it while closed,
    // exactly like a covered title's own letters (see the CSS comment on
    // .tab-color-block).
    const colorBlock = document.createElement('div');
    colorBlock.className = 'tab-color-block';
    if (palette) colorBlock.style.backgroundColor = palette.rect;
    el.appendChild(colorBlock);
    tabColorBlockEls.push(colorBlock);

    if (panel.body) {
      const body = document.createElement('div');
      body.className = 'tab-body';
      const paragraphs = Array.isArray(panel.body) ? panel.body : [panel.body];
      const pEls = paragraphs.map(text => {
        const p = document.createElement('p');
        appendWithNameSpan(p, text);
        body.appendChild(p);
        return p;
      });

      if (panel.list) {
        const marquee = document.createElement('div');
        marquee.className = 'tab-marquee';
        // No inline background any more - just the sliding text ribbon now,
        // not the colored rectangle behind it (see .tab-marquee in
        // style.css, background:transparent).
        const clip = document.createElement('div');
        clip.className = 'tab-marquee-clip';
        const track = document.createElement('div');
        track.className = 'tab-marquee-track';
        const loopText = panel.list.join(' - ') + ' - ';
        // Same per-letter grid-char treatment as the tab titles (see the
        // title-building loops above/below) - each character its own fixed
        // --glyph-cell-size-wide cell, so the ribbon's letter-spacing matches
        // theirs exactly instead of running together as ordinary text. Not
        // 'tab-title-char' too - its first-/last-child rules are for a single
        // short word, not a long repeating loop.
        (loopText + loopText).split('').forEach(ch => {
          const charEl = document.createElement('span');
          charEl.className = 'grid-char';
          charEl.textContent = ch;
          track.appendChild(charEl);
        });
        clip.appendChild(track);
        marquee.appendChild(clip);
        body.appendChild(marquee);
        if (panel.id === 'about') {
          aboutMarqueeEl = marquee;
          aboutMarqueeClipEl = clip;
          aboutMarqueeTrackEl = track;
        }
      }

      el.appendChild(body);
      if (panel.id === 'about') {
        aboutBodyP = pEls[0];
        aboutBodyParagraphEls = pEls;
        aboutBodyDivEl = body;
      }
    }

    if (panel.id === 'essays') {
      buildEssayCards(el);
    } else if (PROJECTS_BY_PANEL[panel.id]) {
      buildDesignProjects(el, panel.id);
    }

    tabsContainer.appendChild(el);

    el.addEventListener('click', e => {
      // Still on the pristine landing (nothing opened yet, activeIndex is
      // the -1 sentinel) - this exact tab is the one that should open once
      // the OSATNIK glyph finishes forming (portfolio:introComplete, see
      // reveal()), not the landing's own default (About). Stops this click
      // from also bubbling up to script.js's own window-level landing click
      // - redundant (trigger() no-ops once already triggered) but exactly
      // the kind of event-bubbling conflict a direct tab click must avoid.
      if (activeIndex < 0) {
        e.stopPropagation();
        pendingLandingOpenIndex = i;
        if (typeof trigger === 'function') trigger();
        return;
      }
      selectPanel(i);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (activeIndex < 0) {
          pendingLandingOpenIndex = i;
          if (typeof trigger === 'function') trigger();
          return;
        }
        selectPanel(i);
      }
    });

    panelEls.push(el);
  });
}

// About's body text width: from ABOUT_BODY_WIDTH_REFERENCE_LEFT_X to half
// the window width minus 10px (unchanged since before the text moved).
function aboutTextWidth() {
  return Math.max(0, Math.round(window.innerWidth / 2 - 10 - ABOUT_BODY_WIDTH_REFERENCE_LEFT_X));
}

// The left edge of About's text column - the one starting "federico
// osatnik" - where its rendered text actually starts. The landing tagline
// and the skills ribbon window start here too (positionLandingTagline/
// positionAboutMarqueeWindow). Measured by measureAboutBodyLeftX in About's
// open layout and kept here, so it can be used while About is closed (on
// the landing); falls back to the column's own left (contentTextLeftX, where
// sizeAboutBody puts it) until then.
let aboutBodyLeftXMeasured = null;
function aboutBodyLeftX() {
  return aboutBodyLeftXMeasured != null ? aboutBodyLeftXMeasured : contentTextLeftX();
}

// The furthest left any rendered glyph run inside el starts - text nodes
// only, so element boxes (like a letter's fixed-width cell) don't count.
function renderedTextLeft(el) {
  let left = Infinity;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    range.selectNodeContents(node);
    [...range.getClientRects()].forEach(r => { if (r.width) left = Math.min(left, r.left); });
  }
  return left;
}

// Only valid while About is laid out open (withAboutActiveLayout).
function measureAboutBodyLeftX() {
  const left = Math.min(...aboutBodyParagraphEls.map(renderedTextLeft));
  if (isFinite(left)) aboutBodyLeftXMeasured = left;
}

// Sizes every About Me paragraph so its left edge sits at contentTextLeftX
// (the Contact title's / Design project titles' x) and its width to
// aboutTextWidth, leaving its y untouched. Runs inside
// withAboutActiveLayout, so naturalLeft is About's own open-state position.
function sizeAboutBody() {
  if (!aboutBodyParagraphEls.length) return;
  aboutBodyParagraphEls.forEach(p => { p.style.marginLeft = '0px'; });
  const naturalLeft = aboutBodyParagraphEls[0].getBoundingClientRect().left;
  const marginLeft = Math.round(contentTextLeftX() - naturalLeft) + 'px';
  // A fixed width (not just max-width) keeps each paragraph's own wrapping
  // static while its panel animates open/closed - it never reflows, it's
  // simply revealed or covered by the panel's own overflow:hidden edge.
  const px = aboutTextWidth() + 'px';
  aboutBodyParagraphEls.forEach(p => {
    p.style.marginLeft = marginLeft;
    p.style.width = px;
    p.style.maxWidth = px;
  });
}

const ABOUT_BODY_TOP_EDGE_Y = 304;

// Pushes the About body down (via margin-top on its container) so the
// topmost text - the first paragraph's own top, not the container's padded
// box - sits at the fixed viewport y ABOUT_BODY_TOP_EDGE_Y.
function positionAboutBodyTop() {
  if (!aboutBodyDivEl || !aboutBodyP) return;
  // Clear any previous adjustment first so the measurement reflects the
  // body's natural (un-shifted) flow position, not a stale corrected one.
  aboutBodyDivEl.style.marginTop = '0px';
  const textTop = aboutBodyP.getBoundingClientRect().top;
  aboutBodyDivEl.style.marginTop = Math.round(ABOUT_BODY_TOP_EDGE_Y - textTop) + 'px';
}

// Measures where ABOUT_LIST_ANCHOR_WORD would sit in a paragraph fixed at
// the old ABOUT_FIRST_LINE reference width, via a hidden probe placed inside
// the real panel (so it picks up the same "tab-body p" styling). Used
// instead of reading the position off the actual on-screen paragraph, so
// resizing that paragraph (see sizeAboutBody) never drags the marquee's
// anchor along with it.
function measureFrozenAnchorLeft(panel, containerRect) {
  const style = getComputedStyle(aboutBodyP);
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const referenceWidth = Math.ceil(measureCtx.measureText(ABOUT_FIRST_LINE).width + 3) + 'px';

  const probeBody = document.createElement('div');
  probeBody.className = 'tab-body';
  probeBody.style.position = 'absolute';
  probeBody.style.visibility = 'hidden';
  probeBody.style.left = '0px';
  probeBody.style.top = '0px';

  const probeP = document.createElement('p');
  probeP.textContent = ABOUT_ANCHOR_REFERENCE_TEXT;
  probeP.style.width = referenceWidth;
  probeP.style.maxWidth = referenceWidth;
  probeBody.appendChild(probeP);
  panel.appendChild(probeBody);

  let result = null;
  const textNode = probeP.firstChild;
  const idx = textNode.textContent.lastIndexOf(ABOUT_LIST_ANCHOR_WORD);
  if (idx !== -1) {
    const range = document.createRange();
    range.setStart(textNode, idx);
    range.setEnd(textNode, idx + ABOUT_LIST_ANCHOR_WORD.length);
    result = range.getBoundingClientRect().left - containerRect.left;
  }

  panel.removeChild(probeBody);
  return result;
}

// Positions the skills marquee: its left edge lines up with the start of
// where ABOUT_LIST_ANCHOR_WORD would sit in the paragraph at its old
// reference width (where the old marker bar sat), it stretches to the
// panel's own right edge (right: 0, in CSS) - which is exactly where the
// design tab's flap begins - and it sits a quarter of the screen's height
// above the bottom edge of the viewport.
const ABOUT_MARQUEE_LEFT_SHIFT = 40;

function positionAboutMarquee() {
  if (!aboutBodyP || !aboutMarqueeEl) return;
  const panel = aboutMarqueeEl.closest('.tab-panel') || aboutMarqueeEl.parentElement;
  const containerRect = panel.getBoundingClientRect();

  const measuredAnchorLeft = measureFrozenAnchorLeft(panel, containerRect);
  if (measuredAnchorLeft == null) return;
  // Shifts the whole ribbon (rectangle + the text's own clip window) right
  // by this many px, same direction/amount as the About Me paragraph and
  // the Designs project block's own left-edge moves.
  const anchorLeft = measuredAnchorLeft + ABOUT_MARQUEE_LEFT_SHIFT;

  // The rectangle is free to extend further left than the anchor (purely
  // decorative), but the sliding text itself must never start before the
  // About tab's own collapsed (sliver) width - otherwise it would peek out
  // from under whichever tab is open. aboutMarqueeClipEl's left is relative
  // to the rectangle, so it's re-based off the rectangle's own left.
  const rectExtend = readPx('--tab-marquee-rect-left-extend', 28);
  const rectLeft = anchorLeft - rectExtend;
  const collapsedAboutWidth = panelEls[0] ? measureTitleWidth(panelEls[0]) : 0;
  const clipSafetyBuffer = readPx('--tabs-grid-step', 22);
  const clipLeft = Math.max(anchorLeft, collapsedAboutWidth + clipSafetyBuffer);

  // Between the rectangle's own left edge and the clip's (where the text is
  // actually allowed to start) is pure decorative fill - no text ever sits
  // there. Shrink the rectangle back into a sixth of that free strip.
  const freeSpace = clipLeft - rectLeft;
  const shrunkRectLeft = rectLeft + freeSpace / 6;

  const marqueeLeft = Math.round(shrunkRectLeft);
  aboutMarqueeEl.style.left = marqueeLeft + 'px';
  // The sliding text's window (the clip - not the moving text itself) starts
  // exactly at aboutBodyLeftX, the left edge of About's body text - the same
  // left edge as the landing tagline. See positionAboutMarqueeWindow.
  positionAboutMarqueeWindow();

  const targetViewportTop = window.innerHeight * 0.75;
  aboutMarqueeEl.style.top = Math.round(targetViewportTop - containerRect.top) + 'px';

  const rowFontSize = parseFloat(getComputedStyle(aboutMarqueeTrackEl).fontSize) || 16;

  // Tall enough for three ribbon lines: the visible scrolling line itself
  // plus two more rows' worth of room below it, at the same per-line height
  // the old skills list used at this font size.
  const rowHeight = rowFontSize * 2.13;
  aboutMarqueeEl.style.paddingBottom = Math.round(rowHeight * 2) + 'px';

  // Cut a third off the total rectangle height, taken entirely from the
  // bottom (top/text position above stay put).
  const totalHeight = aboutMarqueeEl.getBoundingClientRect().height;
  const currentPaddingBottom = parseFloat(getComputedStyle(aboutMarqueeEl).paddingBottom) || 0;
  aboutMarqueeEl.style.paddingBottom = Math.max(0, Math.round(currentPaddingBottom - totalHeight / 3)) + 'px';

  // Pull the track up by exactly (font em-box top -> baseline) minus
  // (x-height -> baseline), measured off the real font metrics, so the
  // rectangle's top edge (the track's own box top) lands on the x-height
  // line instead of the taller ascender line - letters with ascenders then
  // overshoot above the rectangle on purpose.
  const trackFont = `${getComputedStyle(aboutMarqueeTrackEl).fontWeight} ${rowFontSize}px ${getComputedStyle(aboutMarqueeTrackEl).fontFamily}`;
  const metricsCanvas = document.createElement('canvas');
  const metricsCtx = metricsCanvas.getContext('2d');
  metricsCtx.font = trackFont;
  const xMetrics = metricsCtx.measureText('x');
  const xHeightAscent = xMetrics.actualBoundingBoxAscent;
  const boxAscent = xMetrics.fontBoundingBoxAscent;
  if (isFinite(xHeightAscent) && isFinite(boxAscent)) {
    aboutMarqueeTrackEl.style.marginTop = -(boxAscent - xHeightAscent) + 'px';
  }

  // The track holds two back-to-back copies of the loop text and animates from
  // translateX(0) to translateX(-50%), i.e. it travels exactly one copy's
  // width per loop. Quantizing that distance into --tabs-grid-step-sized
  // jumps gives the scroll the same pixelated, stepped feel as the rest of
  // the site's motion instead of a smooth glide.
  const oneCopyWidth = aboutMarqueeTrackEl.scrollWidth / 2;
  const gridStep = readPx('--tabs-grid-step', 22);
  const steps = Math.max(1, Math.round(oneCopyWidth / gridStep));
  aboutMarqueeTrackEl.style.animationTimingFunction = `steps(${steps}, end)`;

  positionLandingTagline();
}

// Horizontal only - the ribbon window's x, and the tagline's (which follows
// the same left edge). The window (the clip - not the moving text inside it)
// starts at aboutBodyLeftX and runs to About's own right edge (the clip's CSS
// right, unchanged). Re-measures the text column's left edge first, so it's
// safe to re-run on its own once web fonts have loaded without touching
// anything vertical. Needs About's open layout (withAboutActiveLayout).
function positionAboutMarqueeWindow() {
  if (!aboutMarqueeEl || !aboutMarqueeClipEl) return;
  measureAboutBodyLeftX();
  const panelRect = aboutMarqueeEl.parentElement.closest('.tab-panel').getBoundingClientRect();
  const marqueeLeftX = panelRect.left + (parseFloat(aboutMarqueeEl.style.left) || 0);
  aboutMarqueeClipEl.style.left = (aboutBodyLeftX() - marqueeLeftX) + 'px';
  aboutMarqueeClipEl.style.right = '';
  positionLandingTagline();
}

// The landing's "multidisciplinary designer & photographer" line (#tagline,
// built by script.js) shares the skills ribbon's references: its left edge
// at aboutBodyLeftX (the ribbon window's left and About's body text's left -
// see above), and its text on the ribbon's own baseline. Both are the same
// font at the same size, so the baselines line up when their line boxes share a vertical center: the
// ribbon's line box is its track (line-height 1), the tagline's is its own
// (line-height normal). The ribbon itself isn't moved - it's the reference.
// Called from positionAboutMarquee (initial layout and every resize), after
// the track's own position is final.
function positionLandingTagline() {
  const tagline = document.getElementById('tagline');
  if (!tagline || !aboutMarqueeTrackEl) return;
  const trackRect = aboutMarqueeTrackEl.getBoundingClientRect();
  const taglineRect = tagline.getBoundingClientRect();
  const taglineHeight = taglineRect.height;
  // Left-aligned on its first letter, not its box: every letter sits
  // centered in a fixed-width cell (.grid-char), so the box starts before
  // the text.
  const textLeft = renderedTextLeft(tagline);
  const textLeftInBox = isFinite(textLeft) ? textLeft - taglineRect.left : 0;
  tagline.style.left = (aboutBodyLeftX() - textLeftInBox) + 'px';
  // Contact takes its left/width from this block - keep it in step.
  positionContactTab();
  tagline.style.top = (trackRect.top + (trackRect.height - taglineHeight) / 2) + 'px';
}

// Keeps every .design-project-rect the exact same thickness as the About
// ribbon's own real, currently-settled height, so "the same rectangle" reads
// true across every panel instead of each project rectangle carrying its own
// independently-tuned size.
function syncProjectRectHeights() {
  if (!aboutMarqueeEl) return;
  const h = Math.round(aboutMarqueeEl.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--project-rect-height', h + 'px');
}

// --- About ribbon <-> project-rectangles morph -----------------------------
//
// The About tab's .tab-marquee rectangle and every project's own
// .design-project-rect (built in buildDesignProjects) are never actually
// merged or split as DOM elements - each one is a real, permanently-placed
// element positioned by the ordinary layout systems above (position:fixed at
// a constant viewport box for the project rects, position:absolute relative
// to About's own panel for the About one), so each is always exactly where
// it needs to be at rest, with no extra bookkeeping.
//
// What actually sells "one rectangle deforming into several" is a set of
// temporary .rect-morph-ghost clones: for the duration of a tab switch, every
// real rectangle involved (both the ones being left and the ones being
// arrived at) is hidden (visibility, so its layout box - and so its measured
// rect - stays exactly correct throughout) and a ghost is flown from wherever
// its source rectangle started to wherever its target rectangle is landing,
// RE-MEASURED every frame (see updateRectMorphFrame/measureRectSlot) so it
// tracks the target's real position rather than a single position computed
// once up front - though horizontally that position never actually changes
// (see measureRectSlot), so in practice only the vertical component is ever
// really "in flight". The instant the panel-slide's own animation finishes,
// the ghost's final frame already exactly matches the real target element's
// true resting rect, so swapping back to it (clearRectMorph) is invisible.
const RECT_MORPH_Z = DESIGN_ABOVE_CANVAS_Z - 1;
let activeRectMorph = null;

// The ordered set of real rectangle elements a given panel "owns" - About has
// exactly one (its ribbon), Design/Photography have one per project, in the
// same order as their PROJECTS_BY_PANEL entries.
function getPanelRectSlots(panelId) {
  if (panelId === 'about') return aboutMarqueeEl ? [aboutMarqueeEl] : [];
  const entries = projectRectElsByPanel[panelId];
  return entries ? entries.map(e => e.el) : [];
}

// About's own .tab-marquee is still an ordinary position:absolute child of
// About's panel (unchanged, so About's initial look stays pixel-identical to
// before) - so its absolute viewport box has to be derived from About's
// panel's own known RESTING (settled, genuinely-active) left/width, a plain
// formula independent of whatever the panel is actually doing right now,
// rather than read live: while About's panel is mid-slide (covered <->
// active), its LIVE left/width sweep across the screen along with it, and
// every project's own .design-project-rect is deliberately sized to match
// this exact same resting width (see positionProjectRectsForPanel) so every
// rectangle - About's and every project's - is always the same width, the
// one already visible on About Me.
function computeAboutRestingRect() {
  if (!aboutMarqueeEl) return null;
  const fullWidth = tabsContainer.clientWidth;
  const offset = readPx('--reset-tab-width', 28) + readPx('--tabs-left-shift', 0);
  const naturalWidths = panelEls.map(measureTitleWidth);
  // Mirrors computeTargets' own math for the "About active" case: every
  // other tab now shows the exact same uniform closed-tab width (see
  // computeOverlapStep/computeTargets), not its own title's natural width.
  const rightGroupTotal = (naturalWidths.length - 1) * computeOverlapStep();
  const restingWidth = Math.max(naturalWidths[0], fullWidth - offset - rightGroupTotal);
  // .tab-marquee's own local "left" (set by positionAboutMarquee, panel-
  // relative) and its CSS "right: -30px" extension - combined with the
  // panel's known resting left/width above instead of the panel's current
  // live one - give the same absolute box positionAboutMarquee would produce
  // if About's panel were actually settled at rest right now.
  const localLeft = parseFloat(aboutMarqueeEl.style.left) || 0;
  const rectExtend = 30;
  const left = offset + localLeft;
  const right = offset + restingWidth + rectExtend;
  return { left, width: right - left };
}

// The vertical axis (top/height) is always safe to read live regardless of
// transition state, since panels only ever animate left/width, never
// top/height (every .tab-panel is "top:0;bottom:0" - fixed - always) - only
// About's horizontal axis needs the resting-box substitution above; every
// project rect's own live rect is already exactly right (position:fixed at a
// constant box - see positionProjectRectsForPanel).
function measureRectSlot(el, panelId) {
  const live = el.getBoundingClientRect();
  if (panelId !== 'about') return live;
  const resting = computeAboutRestingRect();
  if (!resting) return live;
  return { left: resting.left, top: live.top, width: resting.width, height: live.height };
}

function mountRectGhost(rect, color) {
  const el = document.createElement('div');
  el.className = 'rect-morph-ghost';
  el.style.left = Math.round(rect.left) + 'px';
  el.style.top = Math.round(rect.top) + 'px';
  el.style.width = Math.round(rect.width) + 'px';
  el.style.height = Math.round(rect.height) + 'px';
  el.style.zIndex = RECT_MORPH_Z;
  if (color) el.style.backgroundColor = color;
  document.body.appendChild(el);
  return el;
}

// Exactly one rectangle set is ever visible at a time - whichever panel is
// currently active. It has to work this way for the whole feature to read as
// "one and the same rectangle" moving/deforming: if a covered tab's own
// rectangles stayed visible too, there'd be more than one copy of "the
// rectangle" on screen simultaneously, which is a contradiction - a single
// object can't be in two places at once. Never called mid-flight (a morph's
// own hiding overrides this while its ghosts stand in) - only once nothing
// is animating.
function refreshRectVisibility() {
  // activeIndex is -1 on the pristine landing (or once slideTabsOut has
  // returned to it) - nothing is open yet, so every rectangle (About's
  // ribbon, every project's own) stays hidden, same as before it's ever
  // been opened for the first time.
  const activePanelId = activeIndex >= 0 ? PANELS[activeIndex].id : null;
  ['about', ...Object.keys(PROJECTS_BY_PANEL)].forEach(panelId => {
    const visible = panelId === activePanelId;
    getPanelRectSlots(panelId).forEach(el => { el.style.visibility = visible ? '' : 'hidden'; });
  });
}

// Ends whatever morph is currently in flight (called both when one finishes
// normally and when a new one interrupts it): removes its ghosts, then
// reapplies the plain "only the active panel's own rectangle(s) are visible"
// rule (not simply un-hiding whatever this particular flight had hidden -
// its own source panel is generally no longer the active one by the time it
// finishes, and must stay covered, not spring back visible). Idempotent/
// no-op once nothing is active.
function clearRectMorph() {
  if (!activeRectMorph) return;
  activeRectMorph.ghosts.forEach(g => g.el.remove());
  activeRectMorph = null;
  refreshRectVisibility();
}

// Sets up the ghost(s) for a prevPanelId -> nextPanelId switch and returns the
// morph context (or null if either side has no rectangles of its own, which
// never happens for about/design/photography but keeps this safe generically).
// Pairing rule, applied independently per ghost index i via a simple clamp:
// a ghost's START is sourceEls[min(i, sourceEls.length-1)]'s rect, its END is
// targetEls[min(i, targetEls.length-1)]. With more targets than sources
// (About -> a project tab) every extra target's ghost starts from the same
// lone source rect - a visual split. With more sources than targets (a
// project tab -> About) every extra source's ghost ends on the same lone
// target rect - a visual merge. Equal counts (switching directly between two
// project tabs) pairs one-to-one, with any leftover on the larger side
// merging into/splitting from the last matched pair.
function beginRectMorph(prevPanelId, nextPanelId) {
  const sourceEls = getPanelRectSlots(prevPanelId);
  const targetEls = getPanelRectSlots(nextPanelId);
  if (!sourceEls.length || !targetEls.length) return null;

  // Clears out any still-in-flight previous morph first (removes its ghosts,
  // settles every rectangle back to the plain active/covered visibility rule)
  // before this one measures/hides its own - a rectangle could otherwise be
  // left permanently hidden if it belonged to both the interrupted morph and
  // this new one.
  clearRectMorph();

  const sourceRects = sourceEls.map(el => measureRectSlot(el, prevPanelId));
  // Hidden for the duration of the flight regardless of active/covered
  // status - refreshRectVisibility (called once the flight ends, via
  // clearRectMorph) is what decides which of them end up visible again.
  new Set([...sourceEls, ...targetEls]).forEach(el => { el.style.visibility = 'hidden'; });

  // Horizontally (and now color-wise) every ghost just follows its own
  // target's rect/palette (see measureRectSlot/updateRectMorphFrame) - never
  // eased/interpolated of its own accord - so it's already given the
  // target's own left/width/height/color right from this first paint too,
  // rather than the source's, which would otherwise flash from the source's
  // footprint to the target's on the very first animation frame.
  const targetColor = (TAB_ACCENT_COLORS[nextPanelId] || {}).rect;
  const ghostCount = Math.max(sourceEls.length, targetEls.length);
  const ghosts = [];
  for (let i = 0; i < ghostCount; i++) {
    const startTop = sourceRects[Math.min(i, sourceRects.length - 1)].top;
    const targetEl = targetEls[Math.min(i, targetEls.length - 1)];
    const targetRect = measureRectSlot(targetEl, nextPanelId);
    const el = mountRectGhost({ left: targetRect.left, top: startTop, width: targetRect.width, height: targetRect.height }, targetColor);
    ghosts.push({ el, startTop, targetEl, targetPanelId: nextPanelId });
  }

  activeRectMorph = { ghosts };
  return activeRectMorph;
}

// Called every animation frame (from animateToTargets' own step loop, with
// the exact same eased progress value it's already computed for the panel
// slide itself) while a morph is in flight. Only ever eases TOP - left/width/
// height are copied straight from the target's own rect every frame (see
// measureRectSlot), never interpolated: every rectangle's left/width is a
// plain viewport constant (About's own resting box, or the shared project
// column box - see the CSS comment on .design-project-rect), never
// influenced by whatever any panel happens to be doing mid-slide, so the one
// motion actually being animated here, the split/merge itself, is purely
// vertical, exactly like a single graphic surface deforming up/down rather
// than sliding sideways.
function updateRectMorphFrame(eased) {
  if (!activeRectMorph) return;
  activeRectMorph.ghosts.forEach(({ el, startTop, targetEl, targetPanelId }) => {
    const targetRect = measureRectSlot(targetEl, targetPanelId);
    const top = startTop + (targetRect.top - startTop) * eased;
    el.style.left = Math.round(targetRect.left) + 'px';
    el.style.width = Math.round(targetRect.width) + 'px';
    el.style.height = Math.round(targetRect.height) + 'px';
    el.style.top = Math.round(top) + 'px';
  });
}

// Left-side overlap is sized in characters, not pixels, so however many letters
// stay visible on a covered tab tracks the title's actual per-letter cell size.
function computeOverlapStep() {
  const cellSize = readPx('--glyph-cell-size', 20);
  const chars = readPx('--tab-overlap-chars', 3);
  return Math.round(cellSize * chars);
}

// One fixed stacking order inside tabsContainer, whatever is open, closed,
// sliding or scrolled - each tab's surface, then its own content just above
// it, then the next tab above that:
//   landing (#nameCanvas z0, page background - outside tabsContainer, z1)
//   < About (1) < Design (3) < Design content (4)
//   < Photography (5) < Photography content (6)
//   < the OSATNIK hotspot (8, style.css) < the project hover bar (9) and its
//   title/year ghosts (10) < Contact (11, style.css)
// ...and above all of tabsContainer, on <body>: the open-project view
// (backdrop/viewer/drawer, 1002-1004) - the only thing that covers Contact.
// "Content" is the project column and its carousel portals/navs - siblings
// of the panels (not descendants), so they're never clipped to their tab's
// own rectangle and can only be covered by a later tab's surface.
function panelLayerZ(index) {
  return 2 * index + 1;
}
function panelContentLayerZ(index) {
  return 2 * index + 2;
}

// Tab i's left (in tabsContainer's coordinates) in the landing layout:
// every tab closed, overlapStep wide, packed flush against the right edge.
// The one source for that position - computeTargets' landing case and the
// landing photo's width (sizeLandingPhoto) both read it.
function landingTabLeft(i) {
  const overlapStep = computeOverlapStep();
  return tabsContainer.clientWidth - (panelEls.length - i) * overlapStep;
}

// The landing photo (body::before in CSS) keeps its left edge at the
// screen's left and grows - at its own aspect ratio, never distorted - until
// its right edge meets the About Me tab's left edge on the landing: its
// width is exactly that distance, and its height follows from the ratio
// (background-size: <width> auto). Re-run on resize.
function sizeLandingPhoto() {
  const aboutIndex = PANELS.findIndex(p => p.id === 'about');
  const aboutLeftX = tabsContainer.getBoundingClientRect().left + landingTabLeft(aboutIndex);
  document.documentElement.style.setProperty('--landing-photo-size', Math.round(aboutLeftX) + 'px auto');
}

function computeTargets() {
  const fullWidth = tabsContainer.clientWidth;
  // --tabs-left-shift pushes the active tab and its covered-left stack
  // further right without touching --reset-tab-width (which also sizes the
  // separate "back to start" strip).
  const offset = readPx('--reset-tab-width', 28) + readPx('--tabs-left-shift', 0);
  const n = panelEls.length;
  const overlapStep = computeOverlapStep();

  // The landing state - nothing opened yet (activeIndex is the -1 sentinel,
  // see selectPanel/slideTabsOut) - every tab just sits closed, in its
  // natural order, packed edge-to-edge and flush against the screen's own
  // right edge (no gap past the last one) instead of the left offset the
  // covered-left group below starts from. No overlap/z-stacking needed here
  // either (unlike that group) since nothing is open yet to cover any of them.
  if (activeIndex < 0) {
    const targets = new Array(n);
    for (let i = 0; i < n; i++) {
      targets[i] = { left: landingTabLeft(i), width: overlapStep, z: panelLayerZ(i) };
    }
    return targets;
  }

  const naturalWidths = panelEls.map(measureTitleWidth);
  const targets = new Array(n);

  // Left of (and including) the open panel: every tab starts exactly one
  // overlapStep further right than the previous one, so every covered tab -
  // including the one right before the open one - shows the same sliver.
  // (offset leaves room for the persistent "back to start" strip at the very left edge)
  for (let i = 0; i <= activeIndex; i++) {
    targets[i] = { left: offset + i * overlapStep, width: naturalWidths[i], z: panelLayerZ(i) };
  }
  const activeLeft = offset + activeIndex * overlapStep;

  // Right of the open panel: not-yet-visited tabs, each shown at the exact
  // same uniform closed-tab width as the covered-left ones (overlapStep) -
  // no longer sized to their own title's length, so every closed tab, on
  // either side of the open one, leaves the same visible strip - packed
  // edge-to-edge from the right.
  const rightCount = n - (activeIndex + 1);
  const rightGroupTotal = rightCount * overlapStep;

  let cursor = fullWidth - rightGroupTotal;
  for (let i = activeIndex + 1; i < n; i++) {
    targets[i] = { left: cursor, width: overlapStep, z: panelLayerZ(i) };
    cursor += overlapStep;
  }

  const activeWidth = Math.max(naturalWidths[activeIndex], fullWidth - activeLeft - rightGroupTotal);
  targets[activeIndex] = { left: activeLeft, width: activeWidth, z: panelLayerZ(activeIndex) };

  return targets;
}

// The site's one stepped ("rasterized") motion clock - the same one the
// tab-panel slide runs on (animateToTargets): time advances only every
// --tabs-step-interval, through the tabs' own ease (TABS_EASE), so a value
// moves in discrete jumps rather than gliding. With snapToGrid, the
// distance travelled so far is also snapped to --tabs-grid-step
// (snapToTabsGrid) - exactly like the panels' own left - so it jumps from
// grid position to grid position. apply(value) paints each frame; the last
// frame always lands exactly on `to`. One animation per owner[key] at a
// time: starting a new one cancels the previous.
function runSteppedAnimation(owner, key, from, to, durationMs, apply, options) {
  const opts = options || {};
  if (owner[key]) cancelAnimationFrame(owner[key]);
  const startTime = performance.now();
  const stepIntervalMs = readPx('--tabs-step-interval', 35);

  function step(now) {
    const elapsed = now - startTime;
    if (elapsed >= durationMs) {
      apply(to);
      owner[key] = null;
      if (opts.onFrame) opts.onFrame();
      return;
    }
    const steppedElapsed = Math.floor(elapsed / stepIntervalMs) * stepIntervalMs;
    const eased = TABS_EASE(Math.min(1, steppedElapsed / durationMs));
    const travelled = (to - from) * eased;
    apply(from + (opts.snapToGrid ? snapToTabsGrid(travelled) : travelled));
    if (opts.onFrame) opts.onFrame();
    owner[key] = requestAnimationFrame(step);
  }

  owner[key] = requestAnimationFrame(step);
}

// Same stepped/rasterized motion as animateElementLeft, but for an element's
// own scrollLeft (used by the carousel's prev/next buttons) instead of its
// CSS left - so a button-triggered step feels like the same jumpy motion
// language as the tab-panel slide, not a plain native smooth-scroll ease.
function animateScrollLeft(el, toLeft, durationMs) {
  runSteppedAnimation(el, '_scrollAnimFrame', el.scrollLeft, toLeft, durationMs,
    v => { el.scrollLeft = Math.round(v); });
}

function animateElementLeft(el, fromLeft, toLeft, durationMs) {
  runSteppedAnimation(el, '_animFrame', fromLeft, toLeft, durationMs,
    v => { el.style.left = Math.round(v) + 'px'; });
}

// ---------------------------------------------------------------------
// Tab title layout: every tab's own title (one .tab-title-char span per
// letter - see buildPanels) switches between its normal single horizontal
// line and a single-column, one-letter-per-line stack, always upright/never
// rotated, whenever that specific tab is closed (covered-left sliver or
// covered-right strip alike - both now the exact same uniform width, see
// computeTargets) rather than simply whether it's the active tab.
//
// Every letter is pulled out of normal text flow (position:absolute - see
// .tab-title .tab-title-char in style.css) and moved purely by its own
// 'transform: translate(x, y)', so the switch between layouts can be
// animated as continuous per-letter motion - grid-snapped, stepped motion
// mirroring script.js's own FEDERICO OSATNIK glyph animation - instead of
// an instant re-flow. See setupTabTitleChars/setTabTitleLayoutsInstant
// (instant - resize, initial layout) and animateToTargets (animated, in
// lockstep with the panel's own slide).
// ---------------------------------------------------------------------

function tabTitleCellSize() {
  return readPx('--glyph-cell-size', 20);
}

// The one uniform width every closed tab - covered-left sliver or
// covered-right strip alike - is shown at (see computeTargets). Reused here
// as the column a closed tab's own vertical title letters center within.
function closedTabWidth() {
  return computeOverlapStep();
}

function snapToCell(v, cellSize) {
  return Math.round(v / cellSize) * cellSize;
}

// One letter's own slot, in px relative to its title's top-left corner -
// which is always the same point as its panel's own left edge (.tab-header/
// .tab-title carry no left padding or margin of their own - see style.css),
// so x:0 here already means "flush against this tab's left edge" in both
// layouts, with nothing further to line up. Horizontal lays every letter
// out left-to-right on a single row (index * cellSize - the same math
// measureTitleWidth already uses elsewhere for this title's natural width),
// so the first letter alone sits at x:0; vertical stacks every letter at
// that same x:0 instead - a single left-aligned column, never centered -
// each exactly cellSize further down than the last (index * cellSize, a
// constant step - never the font's own line-height or a glyph's own measured
// width), so letters read as equally spaced cells on one regular grid
// whichever direction they're arranged in. Because the very first letter
// (index 0) already sits at (0, 0) in both layouts, it never actually needs
// to move between them - only every letter after it does - which is what
// keeps it visually anchored to the tab's own left edge through the
// transition (see animateToTargets).
function tabTitleCharSlot(index, vertical, cellSize) {
  return vertical
    ? { x: 0, y: index * cellSize }
    : { x: index * cellSize, y: 0 };
}

// panelIndex -> { titleEl, chars, cur } - cur[i] is the last x/y actually
// painted for that letter, so a new transition always continues from
// wherever the letters really are on screen right now (including mid-
// flight, if a new transition interrupts one already in progress) instead
// of assuming they've settled into a clean resting slot. Indexed by panel
// index (not a WeakMap) since every panel is built exactly once, at
// buildPanels time, and lives for the page's whole life.
const tabTitleStates = [];

// Pulls this title's letters out of normal text flow onto the animated grid
// - called once per panel, right after its own per-letter spans are built
// (see buildPanels).
function setupTabTitleChars(panelIndex, titleEl) {
  const chars = Array.from(titleEl.querySelectorAll('.tab-title-char'));
  tabTitleStates[panelIndex] = { titleEl, chars, cur: chars.map(() => ({ x: 0, y: 0 })) };
}

// This panel's title layout once `target` (one computeTargets()-shaped
// entry) has actually settled - vertical for a closed tab (covered-left or
// covered-right, always the same uniform width now), horizontal only for
// whichever one is actually active. Falls back to comparing against the
// title's own real required width (measureTitleWidth) rather than hard-
// coding "not active = vertical", so a title short enough to fit the closed
// width on its own still just shows horizontally.
function tabTitleLayoutForTarget(panelIndex, target) {
  const columnWidth = panelIndex === activeIndex ? target.width : closedTabWidth();
  const vertical = columnWidth < measureTitleWidth(panelEls[panelIndex]);
  return { vertical, columnWidth };
}

// Paints every title's letters straight to their final position for the
// given settled `targets` - no animation. Used wherever panel positions
// themselves are applied instantly (applyTargets: initial layout, resize,
// and finalizing an animated transition once it completes).
function setTabTitleLayoutsInstant(targets) {
  const cellSize = tabTitleCellSize();
  panelEls.forEach((el, i) => {
    const state = tabTitleStates[i];
    if (!state) return;
    const { vertical } = tabTitleLayoutForTarget(i, targets[i]);
    // Big enough to hold either layout - the horizontal row's own full
    // width either way, since letters are never centered/padded to fill a
    // wider column any more (see tabTitleCharSlot).
    state.titleEl.style.width = Math.max(cellSize, state.chars.length * cellSize) + 'px';
    state.titleEl.style.height = Math.max(cellSize, state.chars.length * cellSize) + 'px';
    state.titleEl.classList.toggle('is-vertical', vertical);
    state.chars.forEach((c, ci) => {
      const slot = tabTitleCharSlot(ci, vertical, cellSize);
      c.style.transform = `translate(${Math.round(slot.x)}px, ${Math.round(slot.y)}px)`;
      state.cur[ci] = slot;
    });
  });
}

function applyTargets(targets) {
  // Cancel any in-flight animation so a stale rAF tick can't overwrite this
  // synchronous update on its next frame.
  if (animFrame) {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  }
  panelsAnimating = false;
  currentPanelTargets = targets;
  panelEls.forEach((el, i) => {
    el.style.left = Math.round(targets[i].left) + 'px';
    el.style.width = Math.round(targets[i].width) + 'px';
    el.style.zIndex = targets[i].z;
  });
  setTabTitleLayoutsInstant(targets);
}

function animateToTargets(targets, options) {
  const opts = options || {};
  const durationMs = opts.durationMs || TABS_DURATION_MS;
  currentPanelTargets = targets;
  const starts = opts.starts || panelEls.map(el => ({
    left: parseFloat(el.style.left) || 0,
    width: parseFloat(el.style.width) || 0
  }));
  const startTime = performance.now();
  const stepIntervalMs = readPx('--tabs-step-interval', 35);

  panelsAnimating = true;
  hideDesignHoverBar();
  panelEls.forEach((el, i) => { el.style.zIndex = targets[i].z; });

  // Sets up this transition's own per-letter title animation, once, up
  // front: "start" is wherever each letter actually sits right now (its
  // last painted x/y - see tabTitleStates), "end" is this title's final
  // layout once `targets` itself has settled (tabTitleLayoutForTarget).
  // .is-vertical is toggled immediately (matching how .is-active below is
  // already toggled immediately, not only once settled), so the per-letter
  // underline (style.css) already reads correctly for whichever layout this
  // transition is heading toward. Every frame below then eases each letter
  // from its start slot to its end slot using the exact same eased/stepped
  // clock as the panel slide itself, so the two stay perfectly in sync.
  const titleCellSize = tabTitleCellSize();
  const titleTransitions = panelEls.map((el, i) => {
    const state = tabTitleStates[i];
    if (!state) return null;
    const { vertical } = tabTitleLayoutForTarget(i, targets[i]);
    state.titleEl.classList.toggle('is-vertical', vertical);
    // Big enough to hold either layout - see setTabTitleLayoutsInstant.
    state.titleEl.style.width = Math.max(titleCellSize, state.chars.length * titleCellSize) + 'px';
    state.titleEl.style.height = Math.max(titleCellSize, state.chars.length * titleCellSize) + 'px';
    return {
      state,
      starts: state.cur.slice(),
      ends: state.chars.map((_, ci) => tabTitleCharSlot(ci, vertical, titleCellSize))
    };
  });

  if (animFrame) cancelAnimationFrame(animFrame);

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);

    if (t >= 1) {
      applyTargets(targets);
      positionDesignProjects();
      positionDesignCarousels();
      if (opts.onComplete) opts.onComplete();
      animFrame = null;
      return;
    }

    const steppedElapsed = Math.floor(elapsed / stepIntervalMs) * stepIntervalMs;
    const steppedT = Math.min(1, steppedElapsed / durationMs);
    const eased = TABS_EASE(steppedT);

    // Snap the distance travelled so far, not the absolute position: at
    // eased = 0 that's always exactly 0, so the first frame lands precisely
    // on the start position instead of rounding to the nearest grid step and
    // visibly hopping before the slide actually begins.
    const lefts = panelEls.map((el, i) => {
      const from = starts[i];
      const to = targets[i];
      return from.left + snapToTabsGrid((to.left - from.left) * eased);
    });

    const widths = new Array(panelEls.length);
    panelEls.forEach((el, i) => {
      const from = starts[i];
      const to = targets[i];
      let width;
      // The open tab and everything to its right are packed edge-to-edge
      // with no overlap buffer, so their width is derived from the next
      // tab's own snapped left instead of being snapped independently -
      // that keeps a shared edge from ever gapping (or overlapping) by a
      // stray rounding step mid-transition, which is what showed through
      // as a flash of the page background between tabs. That group is
      // always meant to reach all the way to the screen's own right edge,
      // so the true last one derives from the screen's own right edge
      // instead of a next tab - true both for the active tab + right-group
      // (always reaches the screen edge) and for the landing layout
      // (computeTargets' activeIndex<0 case, now also flush against that
      // same edge) - whichever boundary this panel actually touches at
      // rest, checked directly against the final `targets` rather than
      // assumed from activeIndex, so both groups share one rule. A covered-
      // left panel (i<activeIndex in the normal, some-tab-open case) never
      // touches its neighbor this way (it genuinely overlaps it instead -
      // see the left-of-active loop above), so it always falls through to
      // plain independent interpolation below.
      const nextRestBoundary = i < panelEls.length - 1 ? targets[i + 1].left : tabsContainer.clientWidth;
      const touchesNextAtRest = Math.round(targets[i].left + targets[i].width) === Math.round(nextRestBoundary);
      if (touchesNextAtRest) {
        const nextLeft = i < panelEls.length - 1 ? lefts[i + 1] : tabsContainer.clientWidth;
        width = nextLeft - lefts[i];
      } else {
        width = from.width + snapToTabsGrid((to.width - from.width) * eased);
      }
      width = Math.max(0, width);
      widths[i] = width;
      el.style.left = Math.round(lefts[i]) + 'px';
      el.style.width = Math.round(width) + 'px';
    });

    // Every letter eases toward its own title's final slot using this same
    // frame's eased/stepped progress - grid-snapped per letter (same
    // "rasterized" motion language as script.js's own OSATNIK glyphs and
    // the panel slide above), so letters visibly step from cell to cell
    // rather than gliding smoothly, in lockstep with the panel's own motion.
    titleTransitions.forEach(transition => {
      if (!transition) return;
      const { state, starts, ends } = transition;
      state.chars.forEach((c, ci) => {
        const from = starts[ci];
        const to = ends[ci];
        const x = from.x + snapToCell((to.x - from.x) * eased, titleCellSize);
        const y = from.y + snapToCell((to.y - from.y) * eased, titleCellSize);
        c.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        state.cur[ci] = { x, y };
      });
    });

    // Keeps the Design carousel portal's clip width/position, and the
    // project title/tags block's own position, tracking Design's own panel
    // live, frame by frame, instead of only snapping to its start/end
    // position before and after the slide. positionDesignProjects has to run
    // first each frame too - the carousel/ghost positions below are measured
    // from the title/tags' own live rects, which only mean anything once
    // .design-projects itself has been moved to match the panel's current
    // (mid-animation) position.
    positionDesignProjects();
    positionDesignCarousels();
    if (opts.onFrame) opts.onFrame(eased);

    animFrame = requestAnimationFrame(step);
  }

  animFrame = requestAnimationFrame(step);
}

function layoutPanels(animate, rectMorph) {
  const targets = computeTargets();
  if (animate) {
    animateToTargets(targets, rectMorph ? {
      onFrame: updateRectMorphFrame,
      onComplete: clearRectMorph
    } : undefined);
  } else {
    applyTargets(targets);
  }
  panelEls.forEach((el, i) => {
    el.classList.toggle('is-active', i === activeIndex);
    el.setAttribute('aria-expanded', i === activeIndex ? 'true' : 'false');
  });
  // .design-projects is positioned against the Design panel's own live
  // getBoundingClientRect() (see positionDesignProjects), which only means
  // anything once that panel has actually reached its real on-screen
  // position - previously this only ever ran on page load and window
  // resize, never on a plain tab switch, so switching to Design without
  // ever resizing the window left the whole title/tags block computed
  // against the panel's stale pre-animation (often fully off-screen) rect -
  // rendered off-screen and unreachable to hover or click, even though the
  // carousels above them (repositioned below) looked fine.
  positionDesignProjects();
  positionDesignCarousels();
  // Needs .design-projects' width already resettled just above - its own
  // scrollHeight (what a design/photography color block's height is read
  // from) only measures correctly once that's actually in place, not
  // whatever it was (often just short of one viewport) before this panel
  // had ever actually been laid out active.
  positionTabColorBlocks();
  // Only when nothing is flying - a rect morph's own onComplete (above)
  // settles rectangle visibility itself once its ghosts actually land;
  // applying the plain active/covered rule here immediately instead would
  // un-hide the real target rectangle(s) right at the start of the
  // transition, before the ghost flight standing in for them has even begun.
  if (!rectMorph) refreshRectVisibility();
  // Both this and the carousel portal's clip region track Design/Photography's
  // live position - recompute again once this transition has actually
  // settled, not just at its (pre-move) start.
  if (animate) {
    setTimeout(() => {
      positionDesignProjects();
      positionDesignCarousels();
      positionTabColorBlocks();
    }, readDurationMs('--tabs-transition-duration', 600));
  }
}

// --- Contact tab ----------------------------------------------------------
// A horizontal tab across the top of the screen that opens downward - the
// side tabs' own system turned 90°: the same surface (--tab-open-bg), the
// same title (a .tab-title of per-letter .tab-title-char grid cells, with
// the same dotted underline on hover/open - see style.css), and the same
// stepped open/close motion, on the y axis instead of x. Its geometry
// always comes from existing references (positionContactTab):
//   closed height = a closed side tab's width (computeOverlapStep)
//   left/width    = the landing tagline block's own box
//   open bottom   = the top of the side tabs' titles
// The whole strip is one click target that toggles it. Stacking: the top of
// tabsContainer (z-index in style.css) - above every tab, project and hover
// overlay; only the open-project view (on <body>) covers it.
let contactTabEl = null;
let contactTitleEl = null;
let contactOpen = false;
let contactAnimFrame = null;

// What the open Contact tab shows, above its title.
const CONTACT_EMAIL = 'fosatnik@gmail.com';
const CONTACT_PHONE = '+54 09 11 2321 1174';
const CONTACT_INSTAGRAM = { handle: '@fedeosatnik', url: 'https://www.instagram.com/fedeosatnik/' };
// How long "copied" stays next to a copied value after a click.
const CONTACT_COPIED_MS = 1800;

// Copies text to the clipboard: the async Clipboard API where available
// (secure contexts), otherwise the old hidden-textarea + execCommand route.
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    ok ? resolve() : reject(new Error('copy failed'));
  });
}

// One copyable value line (the email, the phone): the value as a plain-text
// button that copies itself on click, and its own "copied" note just to its
// right (out of flow - see .contact-copied), shown for CONTACT_COPIED_MS
// with its own timer, so each value's note is independent.
function buildCopyValue(value) {
  const line = document.createElement('div');
  line.className = 'contact-value';
  const wrap = document.createElement('span');
  wrap.className = 'contact-copy-wrap';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'contact-copy';
  button.textContent = value;
  button.setAttribute('aria-label', `Copy ${value}`);
  const copied = document.createElement('span');
  copied.className = 'contact-copied';
  copied.textContent = '*copied';
  copied.setAttribute('aria-live', 'polite');
  wrap.appendChild(button);
  wrap.appendChild(copied);
  line.appendChild(wrap);

  let copiedTimer = null;
  button.addEventListener('click', e => {
    // Copies - doesn't also toggle the strip it sits in.
    e.stopPropagation();
    copyToClipboard(value).then(() => {
      copied.classList.add('is-visible');
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(() => copied.classList.remove('is-visible'), CONTACT_COPIED_MS);
    }).catch(() => {});
  });
  return line;
}

function buildContactLabel(text) {
  const label = document.createElement('div');
  label.className = 'contact-label';
  label.textContent = text;
  return label;
}

// The info block (MAIL / email, TEL / phone, INSTAGRAM / handle), inside a
// window that clips it above the title - see .contact-content-window and
// positionContactContent.
function buildContactContent() {
  const win = document.createElement('div');
  win.className = 'contact-content-window';
  const content = document.createElement('div');
  content.className = 'contact-content';

  const igLabel = buildContactLabel('INSTAGRAM');
  const igLine = document.createElement('div');
  igLine.className = 'contact-value';
  const ig = document.createElement('a');
  ig.className = 'contact-link';
  ig.href = CONTACT_INSTAGRAM.url;
  ig.target = '_blank';
  ig.rel = 'noopener noreferrer';
  ig.textContent = CONTACT_INSTAGRAM.handle;
  // Opens the profile - doesn't also toggle the strip.
  ig.addEventListener('click', e => e.stopPropagation());
  igLine.appendChild(ig);

  content.appendChild(buildContactLabel('MAIL'));
  content.appendChild(buildCopyValue(CONTACT_EMAIL));
  content.appendChild(buildContactLabel('TEL'));
  content.appendChild(buildCopyValue(CONTACT_PHONE));
  content.appendChild(igLabel);
  content.appendChild(igLine);
  win.appendChild(content);
  return win;
}

function buildContactTab() {
  const tab = document.createElement('div');
  tab.className = 'contact-tab';
  tab.setAttribute('role', 'button');
  tab.setAttribute('tabindex', '0');
  tab.setAttribute('aria-expanded', 'false');
  tab.setAttribute('aria-label', 'contact');
  const title = document.createElement('h2');
  title.className = 'tab-title';
  'contact'.split('').forEach(ch => {
    const charEl = document.createElement('span');
    charEl.className = 'tab-title-char grid-char';
    charEl.textContent = ch;
    title.appendChild(charEl);
  });
  // CONTACT_ORANGE_HANDLE: the orange rectangle with the title in it -
  // always exactly the closed strip's size, resting on the strip's bottom
  // edge, so the strip's own height animation carries it (title, underline
  // and all) down and back up as one piece, while the strip's gray surface
  // unrolls above it.
  const handle = document.createElement('div');
  handle.className = 'contact-handle';
  handle.appendChild(title);
  tab.appendChild(buildContactContent());
  tab.appendChild(handle);

  const toggle = e => {
    // Never also counts as a click on the landing behind it (script.js's
    // window-level "open the site" click).
    e.stopPropagation();
    setContactOpen(!contactOpen);
  };
  tab.addEventListener('click', toggle);
  tab.addEventListener('keydown', e => {
    // Only the strip itself - Enter/Space on the email button or the link
    // inside it act on those, not on the strip.
    if (e.target !== tab) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(e);
    }
  });

  tabsContainer.appendChild(tab);
  contactTabEl = tab;
  contactTitleEl = title;
}

function contactClosedHeight() {
  return computeOverlapStep();
}

// From the screen's top down to the top of the side tabs' titles - every
// side tab's title sits at the same height (.tab-header's shared padding),
// and its first letter never moves between layouts (tabTitleCharSlot), so
// About's first letter's own top is that line.
function contactOpenHeight() {
  const firstChar = tabTitleStates[0] && tabTitleStates[0].chars[0];
  if (!firstChar) return contactClosedHeight();
  return Math.max(contactClosedHeight(), firstChar.getBoundingClientRect().top - tabsContainer.getBoundingClientRect().top);
}

// Left exactly on the right edge of Photography's color block while
// Photography is open (contentOriginX); its right edge is the screen's
// (CSS right:0). Called from positionLandingTagline, i.e. on every layout
// pass and resize.
// Height for the current state, and the title laid out as one horizontal
// row of letter cells, starting at contentTextLeftX. The title sits on the
// strip's BOTTOM edge (CSS bottom), so it's carried by the strip's own
// height animation - title and underline ride the moving edge down and
// back up with no motion of their own.
function positionContactTab() {
  if (!contactTabEl) return;
  // CONTACT_LEFT_X = the right edge of Photography's color block (open) -
  // contentOriginX, derived from the open layout, so it never moves when
  // tabs open/close/scroll; only with the viewport.
  contactTabEl.style.left = (contentOriginX() - tabsContainer.getBoundingClientRect().left) + 'px';
  // The title starts at contentTextLeftX - the Design project titles' own x
  // (the project column's left while Design is open, which is where every
  // project title starts), measured from the strip's own left edge. Both
  // titles are the same per-letter cells with a left-aligned first letter,
  // so their first letters line up. Only x - it stays bottom-anchored (CSS).
  const stripLeftX = contactTabEl.getBoundingClientRect().left;
  // One x for the title and the info block above it (both read it in CSS).
  contactTabEl.style.setProperty('--contact-text-left', (contentTextLeftX() - stripLeftX) + 'px');
  // The orange handle's constant height: the closed strip's own.
  contactTabEl.style.setProperty('--contact-handle-height', contactClosedHeight() + 'px');
  const cellSize = tabTitleCellSize();
  const chars = Array.from(contactTitleEl.children);
  contactTitleEl.style.width = chars.length * cellSize + 'px';
  chars.forEach((c, i) => { c.style.transform = `translate(${Math.round(i * cellSize)}px, 0px)`; });
  // The title box is exactly one letter cell tall - measured without the
  // hover/open underline's border, so the letters never shift when it shows.
  // Its bottom offset (CSS) leaves just that underline's own thickness.
  const charHeight = chars.length
    ? chars[0].getBoundingClientRect().height - (parseFloat(getComputedStyle(chars[0]).borderBottomWidth) || 0)
    : cellSize;
  contactTitleEl.style.height = charHeight + 'px';
  positionContactContent(charHeight);
  if (!contactAnimFrame) {
    contactTabEl.style.height = (contactOpen ? contactOpenHeight() : contactClosedHeight()) + 'px';
  }
}

// Distance from an element's top to its text baseline, for a single line
// box: half the leading, then the font's ascent (canvas font metrics of the
// element's own font). contentHeight is the line box's height (padding and
// border excluded).
function baselineOffsetIn(el, contentHeight) {
  const s = getComputedStyle(el);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const m = ctx.measureText('x');
  return (contentHeight - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
}

// The info block's vertical place in the open strip: its first label's
// (MAIL's) baseline on
// the baseline the "contact" title has while the strip is CLOSED
// (CONTACT_CLOSED_TITLE_Y - the title rests on the handle's bottom edge,
// which while closed is the strip's: closed height minus the underline's
// thickness minus its own cell height; its baseline is that plus the
// letters' own baseline offset). Top-anchored in the strip
// (--contact-content-top), so it doesn't move while the strip opens - the
// orange handle slides down off it and the window above the handle (see
// .contact-content-window) uncovers it line by line.
function positionContactContent(titleCharHeight) {
  const label = contactTabEl.querySelector('.contact-label');
  const firstChar = contactTitleEl.firstElementChild;
  if (!label || !firstChar) return;
  const charStyle = getComputedStyle(firstChar);
  const underline = readPx('--tab-title-underline-width', 2.25);
  const closedTitleTop = contactClosedHeight() - underline - titleCharHeight;
  const charContentHeight = titleCharHeight - (parseFloat(charStyle.paddingTop) || 0) - (parseFloat(charStyle.paddingBottom) || 0);
  const closedTitleBaseline = closedTitleTop + (parseFloat(charStyle.paddingTop) || 0) + baselineOffsetIn(firstChar, charContentHeight);
  const labelBaselineOffset = baselineOffsetIn(label, label.getBoundingClientRect().height);
  contactTabEl.style.setProperty('--contact-content-top', (closedTitleBaseline - labelBaselineOffset) + 'px');
}

// Same motion as a side tab's slide (animateToTargets): the same duration,
// ease and stepped clock, the distance travelled so far snapped to the
// same grid - only on height, so the strip physically unrolls downward
// (and rolls back up) instead of sliding sideways.
function setContactOpen(open) {
  contactOpen = open;
  contactTabEl.classList.toggle('is-open', open);
  contactTabEl.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (contactAnimFrame) cancelAnimationFrame(contactAnimFrame);
  const from = contactTabEl.getBoundingClientRect().height;
  const to = open ? contactOpenHeight() : contactClosedHeight();
  const startTime = performance.now();
  const stepIntervalMs = readPx('--tabs-step-interval', 35);
  function step(now) {
    const elapsed = now - startTime;
    if (elapsed >= TABS_DURATION_MS) {
      contactTabEl.style.height = to + 'px';
      contactAnimFrame = null;
      return;
    }
    const steppedT = Math.min(1, (Math.floor(elapsed / stepIntervalMs) * stepIntervalMs) / TABS_DURATION_MS);
    contactTabEl.style.height = Math.round(from + snapToTabsGrid((to - from) * TABS_EASE(steppedT))) + 'px';
    contactAnimFrame = requestAnimationFrame(step);
  }
  contactAnimFrame = requestAnimationFrame(step);
}

// Handles both a normal tab switch AND the very first open, from the
// landing state (activeIndex === -1, see the top of the file) - whichever
// panel is opened first, whether that's About via the landing background
// (reveal(), below) or a specific tab clicked directly while still on the
// landing, activates the same "back to start" chrome (tabsHome, the
// osatnikHotspot) exactly once, the first time is-visible isn't set yet.
function selectPanel(index) {
  if (index === activeIndex) return;
  const prevId = activeIndex >= 0 ? PANELS[activeIndex].id : null;
  activeIndex = index;
  const id = PANELS[index].id;
  // Colors are fixed per tab for the whole session now (TAB_ACCENT_COLORS,
  // read once in buildPanels) - nothing to re-roll or re-apply here on
  // every open any more. beginRectMorph below still runs (its own
  // ghosts/rectangles are just hidden now - see .rect-morph-ghost/
  // .design-project-rect in style.css) since other code (layoutPanels'
  // refreshRectVisibility timing) still depends on its return value.
  // No previous panel to morph a rectangle from (prevId is null) the first
  // time anything opens - beginRectMorph already returns null whenever its
  // source panel has no rectangles of its own, so the new panel's own
  // rectangle simply appears once refreshRectVisibility runs, same as any
  // panel opened for the very first time.
  const rectMorph = beginRectMorph(prevId, id);

  const firstOpen = !tabsContainer.classList.contains('is-visible');
  if (firstOpen) {
    tabsContainer.classList.add('is-visible');
    osatnikHotspot.classList.add('is-active');
    animateElementLeft(tabsHome, parseFloat(tabsHome.style.left) || -readPx('--reset-tab-width', 28), 0, introDurationMs());
  }

  layoutPanels(true, rectMorph);
}

// Kept separate from script.js's TRANSITION_MS (which times the glyph
// particles snapping into the OSATNIK block) so slowing the tabs' own
// slide-in/out doesn't also slow that unrelated animation.
function introDurationMs() {
  return readDurationMs('--tabs-intro-duration', (typeof TRANSITION_MS !== 'undefined') ? TRANSITION_MS : 350);
}

// Opens whichever tab the landing was asking for (pendingLandingOpenIndex -
// About by default, the landing background's own click path; a specific tab
// if it was clicked directly instead) once the OSATNIK glyph collapse has
// finished forming (script.js dispatches 'portfolio:introComplete'), so that
// tab lands open right after the glyph settles - the same two-beat "glyph
// forms, then the interface opens" feel either entry point used to have.
// Every tab is already visible, closed, on screen well before this ever
// runs (see computeTargets' activeIndex<0 landing layout and the initial
// layoutPanels(false) call at the bottom of this file) - this transition is
// a plain selectPanel() from that resting state, nothing off-screen to
// slide in any more.
function reveal() {
  selectPanel(pendingLandingOpenIndex);
}
window.addEventListener('portfolio:introComplete', reveal);

// Undoes selectPanel(): every tab slides back to the closed, landing layout
// (computeTargets' activeIndex<0 case) instead of off past the right edge,
// since that closed-but-visible arrangement is now the site's own resting
// state, on the landing and after a reset alike. The "back to start" strip
// slides back out to the left, same as before.
function slideTabsOut() {
  // The whole interface is settling back to the landing together, not
  // switching between two rectangle layouts - cancel any in-flight
  // split/merge so its ghosts don't get left stranded and every rectangle
  // it had hidden is visible again (refreshRectVisibility below then hides
  // them all properly, since nothing is active any more).
  clearRectMorph();
  const starts = panelEls.map(el => ({
    left: parseFloat(el.style.left) || 0,
    width: parseFloat(el.style.width) || 0
  }));
  activeIndex = -1;
  // Back to its own default (About) - otherwise a later plain click/swipe on
  // the landing background would still open whichever specific tab was last
  // clicked directly, since trigger() (script.js) always opens
  // pendingLandingOpenIndex and nothing else ever resets it back.
  pendingLandingOpenIndex = 0;
  const targets = computeTargets();
  const duration = introDurationMs();
  animateToTargets(targets, { starts, durationMs: duration });
  animateElementLeft(tabsHome, parseFloat(tabsHome.style.left) || 0, -readPx('--reset-tab-width', 28), duration);

  // Removed right away so re-opening/pointer-events are blocked immediately.
  // Project content isn't hidden for this - it slides back to the landing
  // layout with its own tab (animateToTargets repositions it every frame).
  tabsContainer.classList.remove('is-visible');
  panelEls.forEach(el => {
    el.classList.remove('is-active');
    el.setAttribute('aria-expanded', 'false');
  });
  refreshRectVisibility();
}

// Clicking the OSATNIK glyph block once it has formed: send everything back to
// the pristine landing page, ready to be swiped/clicked open again.
function resetEverything(e) {
  if (!tabsContainer.classList.contains('is-visible')) return;
  e.stopPropagation();
  osatnikHotspot.classList.remove('is-active');
  slideTabsOut();
  // Starts scattering the glyphs back this same instant, not once the tabs
  // have fully finished sliding off - so both animations run at the same
  // time, neither waiting on the other.
  if (typeof resetToStart === 'function') resetToStart();
}

osatnikHotspot.addEventListener('click', resetEverything);
tabsHome.addEventListener('click', resetEverything);

// contentOriginX/ABOUT_BODY_TOP_EDGE_Y (and positionAboutMarquee's
// own anchor, further below) describe where About's text sits once About is
// actually OPEN (active, its title horizontal, its panel at its real active
// width) - sizeAboutBody/positionAboutBodyTop/positionAboutMarquee all work
// by measuring that text's live, natural position and solving for the
// margin needed to land it exactly there, so they only measure correctly
// while About's panel genuinely IS in that active layout. Now that About
// isn't necessarily the active (or even open) tab any more when the page
// first loads or is resized - it might be closed on the landing, its title
// vertical, its panel a narrow strip - this briefly, synchronously forces
// About's own real "active" target layout, runs the given measurements
// against it, then restores whatever the actual current layout was. Nothing
// ever paints in between (no await, no rAF - plain synchronous calls), so
// there's no visible flicker.
function withAboutActiveLayout(fn) {
  const savedActiveIndex = activeIndex;
  activeIndex = PANELS.findIndex(p => p.id === 'about');
  applyTargets(computeTargets());
  fn();
  activeIndex = savedActiveIndex;
  applyTargets(computeTargets());
}

buildPanels();
buildContactTab();
positionDesignPhotoDrawer();
// Lays every tab out closed, in order, flush against the screen's own right
// edge (computeTargets' activeIndex<0 case) - visible and clickable from the
// very first frame, well before any interaction, instead of waiting
// off-screen for reveal().
layoutPanels(false);
sizeLandingPhoto();
withAboutActiveLayout(() => {
  sizeAboutBody();
  positionAboutBodyTop();
  positionAboutMarquee();
  syncProjectRectHeights();
});
// The ribbon window and the tabs' closed width (the landing photo's reach)
// depend on the real (web-font) text, which may still be loading on that
// first pass.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    // withAboutActiveLayout re-applies panel targets instantly, which would
    // cut short a tab slide already under way - the next resize/layout pass
    // covers that (rare) case instead. The tagline only needs the ribbon's
    // (tab-independent) vertical position.
    positionLandingTagline();
    sizeLandingPhoto();
    if (panelsAnimating) return;
    withAboutActiveLayout(() => {
      positionAboutMarqueeWindow();
    });
  });
}
window.addEventListener('resize', () => {
  // A resize mid-transition would otherwise leave a ghost's geometry (and the
  // real rectangles it had hidden) stale/inconsistent with the freshly
  // recomputed layout below.
  clearRectMorph();
  positionDesignPhotoDrawer();
  if (designPhotoViewerEls.length) {
    fitViewerMedia();
    layoutPhotoStack();
  }
  positionDrawerDescriptionColumns();
  // The columns' height follows the viewport's - re-split the text.
  flowDrawerDescription(drawerDescriptionText, drawerDescriptionLink, drawerDescriptionInlineLinks, drawerDescriptionHeading);
  positionDrawerControls();
  // Safe (and correct) whether or not anything has been opened yet -
  // computeTargets/applyTargets both handle the activeIndex<0 landing case
  // on their own now, same as any other resting state.
  layoutPanels(false);
  sizeLandingPhoto();
  withAboutActiveLayout(() => {
    sizeAboutBody();
    positionAboutBodyTop();
    positionAboutMarquee();
    syncProjectRectHeights();
  });
  if (tabsContainer.classList.contains('is-visible')) {
    if (tabsHome._animFrame) {
      cancelAnimationFrame(tabsHome._animFrame);
      tabsHome._animFrame = null;
    }
    tabsHome.style.left = '0px';
  }
});

