/* Magic Mirror
 * Module: MMM-Buller
 *
 * By da4throux
 * MIT Licensed.
 */

Module.register("MMM-Buller", {

  // Define module defaults
  defaults: {
    debug: true, //console.log more things to help debugging
    list_template: {
      type: "gTasks", // allow using other kind of data input later on
      updateInterval: 1 * 60 * 1000 * 60 * 6, // every 6 hours
      initialLoadDelay: 100, // start delay seconds
      metaData: false, //true: leveraging metaData from the task
      alwaysShowDueTask: true, //true: a due Task will always be shown on the mirror
    },
    maxNumberOfTasksDisplayed: 4,
    updateDomFrequence: 20 * 1000, //20 seconds
  },

  // Define required scripts.
  getStyles: function () {
    return ["MMM-Buller.css"]; //, "font-awesome.css" is version 4
  },

  // Define start sequence.
  start: function () {
    var l, i;
    Log.info("Starting module: " + this.name);
    this.config.infos = [];
    if (!this.config.lists) {
      this.config.lists = [];
    }
    if (this.config.debug) {
      console.log('Buller - lists to be used: ');
      console.log(JSON.stringify(this.config.lists));
    }
    //all lists are based on the template (defined here), superseded by the default value (define in config), superseded by specific value
    for (i = 0; i < this.config.lists.length; i++) {
      this.config.infos[i] = {};
      l = Object.assign(JSON.parse(JSON.stringify(this.config.list_template)),
        JSON.parse(JSON.stringify(this.config.listDefault || {})),
        JSON.parse(JSON.stringify(this.config.lists[i])));
      l.id = i;
      this.config.lists[i] = l;
    }
    this.sendSocketNotification('SET_CONFIG', this.config);
    this.loaded = false;
    var self = this;
    setInterval(function () {
      self.caller = 'updateInterval';
      self.updateDom();
    }, this.config.updateDomFrequence);
  },

  //  getHeader: function () {
  //    var header = this.data.header;
  //    return header;
  //  },
  // Add Task to an element (to simplify getDom)
  getTaskRow: function (task) {

    var firstCell, secondCell, thirdCell, Cell4, listColor, row = document.createElement("tr");

    listColor = task.color ? 'color:' + task.color + ' !important' : false;

    firstCell = document.createElement("td");
    firstCell.className = "align-left bright";
    firstCell.innerHTML = '';

    secondCell = document.createElement("td");
    secondCell.className = "align-left";
    secondCell.innerHTML = '';

    thirdCell = document.createElement("td");
    thirdCell.className = "align-right";
    thirdCell.innerHTML = '';

    Cell4 = document.createElement("td");
    Cell4.className = "align-right";
    Cell4.innerHTML = '';

    if (task.icon) firstCell.innerHTML += '<i class="' + task.icon + '"></i>&nbsp';

    // Vérifiez si task.title, task.notes et task.due sont définis
    var taskTitle = task.title ? task.title : 'No Title';
    var taskNotes = task.notes ? task.notes : '';
    var taskDue = task.due ? new Date(task.due).toLocaleDateString() : '';

    firstCell.innerHTML += taskTitle;

    secondCell.innerHTML += taskNotes;
    thirdCell.innerHTML += taskDue;

    if (listColor) {
      firstCell.setAttribute('style', listColor);
      secondCell.setAttribute('style', listColor);
      thirdCell.setAttribute('style', listColor);
      Cell4.setAttribute('style', listColor);
    }

    if (task.late) {
      Cell4.innerHTML += '&nbsp<i class="fas fa-exclamation"></i>';
      thirdCell.className = "align-right bright";
      thirdCell.setAttribute('style', 'color:red');
      Cell4.setAttribute('style', 'color:red');
    }

    row.appendChild(firstCell);
    row.appendChild(secondCell);
    row.appendChild(thirdCell);
    row.appendChild(Cell4);
    return row;
  },

  getTaskRow: function (task) {
  const row = document.createElement("tr");

  const taskTitle = task.title ? task.title.substring(0, 30) : 'No Title';
  const taskNotes = task.notes ? task.notes.substring(0, 30) : '';
  const taskDue = task.due ? new Date(task.due).toLocaleDateString() : '';
  const listColor = task.color ? `color:${task.color} !important` : null;

  // Cellules
  const firstCell = document.createElement("td");
  const secondCell = document.createElement("td");
  const thirdCell = document.createElement("td");
  const cell4 = document.createElement("td");

  // Classes
  firstCell.className = "align-left bright";
  secondCell.className = "align-left";
  thirdCell.className = "align-right";
  cell4.className = "align-right";

  // Contenu
  if (task.icon) {
    firstCell.innerHTML += `<i class="${task.icon}"></i>&nbsp;`;
  }
  firstCell.innerHTML += taskTitle;
  secondCell.innerHTML = taskNotes;
  thirdCell.innerHTML = taskDue;

  // Couleur (si définie)
  [firstCell, secondCell, thirdCell, cell4].forEach(cell => {
    if (listColor) cell.setAttribute("style", listColor);
  });

  // Retard
  if (task.late) {
    cell4.innerHTML = `&nbsp;<i class="fas fa-exclamation"></i>`;
    thirdCell.classList.add("bright");
    [thirdCell, cell4].forEach(cell => {cell.setAttribute("style", "color:red");});
  }  

  // Ajout au tableau
  row.appendChild(firstCell);
  row.appendChild(secondCell);
  row.appendChild(thirdCell);
  row.appendChild(cell4);

  return row;
},

  getDom: function () {
    if (this.config.debug) {
      console.log('Buller DOM refresh');
    }

    const wrapper = document.createElement("div");
    const table = document.createElement("table");
    wrapper.className = "buller";
    table.className = "small";
    wrapper.appendChild(table);

    const lists = this.config.lists;
    const now = new Date();

    if (lists.length === 0) {
      wrapper.className = "small";
      wrapper.innerHTML = "Your configuration requires a 'lists' element.<br />Check github da4throux/MMM-Buller<br />for more information";
      return wrapper;
    }

    if (!this.loaded) {
      wrapper.innerHTML = "Loading information ...";
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    const todayISO = new Date().toISOString().split("T")[0]; // yyyy-mm-dd
    const allTasks = lists.flatMap((list, i) => {
      const tasks = this.infos[i] || [];
      return tasks.map(task => ({
        ...task,             // déstructure les props de task directement
        orderTaskDue: task.due || todayISO, // date du jour par défaut si undefined
        icon: list.icon,
        late: Date.parse(task.due) < now ? true : false,
        color: list.color,
      }));
    });

    // Étape 2 : Trier toutes les tâches par date d'échéance
    allTasks.sort((a, b) => new Date(a.orderTaskDue) - new Date(b.orderTaskDue));

    // Étape 3 : Afficher les tâches
    let nbOfTasksDisplayed = 0;
    allTasks.forEach(task => {
      if (nbOfTasksDisplayed < this.config.maxNumberOfTasksDisplayed) {
        table.appendChild(this.getTaskRow(task));
        nbOfTasksDisplayed++;
      }
    });
    return wrapper;
  },

  socketNotificationReceived: function (notification, payload) {
    var now = new Date();
    this.caller = notification;
    switch (notification) {
      case "DATA":
        this.infos = payload;
        if (!this.loaded) {
          this.loaded = true;
        }
        this.updateDom();
        if (this.config.debug) {
          console.log(this.infos);
        }
        break;
    }
  }
});
