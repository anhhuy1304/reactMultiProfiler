let globalConfig;
let configIndexedDB;
let refreshInputSelector;
let refreshTimer;

$(document).ready(function () {
    globalConfig = new GlobalConfig();
    configIndexedDB = new ConfigIndexedDB();
    render = new ViewerHandler();
    initSearchProject(); //init project from localstorage
    initSearchData(); //search in table data 
});
function initRefresh() {
    $selectize = $('#intput-interval').selectize({
        create: false,
        width: "100px",
        onChange: function (value) {
            globalConfig.setIntervalTime(parseInt(value));
            setupIntervalRefresh();
            refresh();
        }
    });

    refreshInputSelector = $selectize[0].selectize;
    $("#btn-refresh").click(function () {
        setupIntervalRefresh();
        refresh();
    });
    if (globalConfig.getInterval() != parseInt(refreshInputSelector.getValue())) {
        refreshInputSelector.setValue(globalConfig.getInterval());
    }
    setupIntervalRefresh();
}
function setupIntervalRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    refreshTimer = setInterval(refresh, globalConfig.getInterval() * 1000);
}
function refresh() {
    crawlAndRenderData();
    $("#btn-refresh i").addClass("fa-spin");
    RealtimeStats.refresh(() => {
        $("#btn-refresh i").removeClass("fa-spin");
    })
}

$('#modal-edit-project').on('show.bs.modal', function () {
    $('#listProject').empty();
    let projects = [];
    let servers = {};
    const storage = { ...localStorage };
    for (let projectName in storage) {
        projects.push({ 'projectName': projectName });
        servers[projectName] = storage[projectName].split(',');
    }
    let data = { projects: projects };
    let templateOwner = $("#itemManageServer").html();
    let projectHTML = Mustache.render(templateOwner, data);
    let buttonTemplate = $("#buttonNewProject").html();
    let buttonHTML = Mustache.render(buttonTemplate);
    $('#listProject').append(projectHTML);
    $('#listProject').append(buttonHTML);

    for (let projectName in storage) {
        const project = projectName;
        const listServer = servers[projectName];
        let dataServer = [];
        for (const i in listServer) {
            dataServer.push({ server: listServer[i] });
        }
        $('#input-server-ips-' + project).selectize({
            create: true,
            persist: false,
            maxItems: null,
            valueField: 'server',
            labelField: 'server',
            searchField: ['server'],
            options: dataServer,
            delimiter: ',',
            render: {
                item: function (item) {
                    return '<div>' +
                        (item.server ? '<span class="name">' + item.server + '</span>' : '') +
                        '</div>';
                }
            },
            onInitialize: function () {
                var $select = $("#input-server-ips-" + project).selectize();
                var selectize = $select[0].selectize;
                selectize.setValue(listServer);
            },
        });
    }
});

$(document).on('click', '#newProject', function () {
    $("#newProjectLi").remove();

    let newProjectTemplate = $("#liDontIdNewProject").html();
    let newProjectHTML = Mustache.render(newProjectTemplate);
    $('#listProject').append(newProjectHTML);

    $('#newServer').selectize({
        create: true,
        persist: false,
        maxItems: null,
        delimiter: ','

    });

});

$("#btnSaveManageProject").click(() => {
    //save update current project
    let currentProject = [];
    $("label[name=project]").each(function () {
        currentProject.push($(this).text());
    });
    for (let i in currentProject) {
        let project = currentProject[i];
        let value = $("#input-server-ips-" + project).val().split(',');
        localStorage.setItem(project, value);
    }

    const newProject = $("#newProjectValue").val();
    const newServer = $("#newServer").val();
    if (newProject != undefined && newProject.length > 0 && newServer != undefined && newServer.length > 0) {
        const listNewServer = newServer.split(',');
        localStorage.setItem(newProject, listNewServer);
        console.log('save data');
    }
    const storage = { ...localStorage };
    let option = [];
    for (project in storage) {
        option.push({ name: project, servers: storage[project] });
    }
    $('#intput-project-search').selectize()[0].selectize.addOption(option);
})

function initSearchProject() {
    const storage = { ...localStorage };
    let option = [];
    for (project in storage) {
        option.push({ name: project, servers: storage[project] });
    }

    $('#intput-project-search').selectize({
        create: false,
        searchField: ['name', 'servers'],
        valueField: 'name',
        labelField: 'name',
        options: option,
        render: {
            item: function (item, escape) {
                return '<div>' +
                    (item.name ? '<span class="name">' + escape(item.name) + '</span>' : '') +
                    '</div>';
            },
            option: function (item, escape) {
                return '<div>' +
                    '<div class="label">' + escape(item.name) + '</div>' +
                    '<div class="caption">' + escape(item.servers) + '</div>' +
                    '</div>';
            }
        },
        onChange: function () {
            optionView = $('input[name="opt-type"]:checked').val();
            const projectName = $('#intput-project-search').val();
            const listServer = storage[projectName].split(',');
            globalConfig.setCurrentProject(projectName, listServer);
            configIndexedDB.setConfigCurrentProject(projectName, listServer);
        }
    });
}
function initSearchData() {
    const table = $('#data').DataTable({
        // searching: false,
        "order": [[ 1, "asc" ]],
        paging: false,
        info: false,
    });
    $('#filter').on('keyup change clear', function () {
        table.search(this.value).draw();
    });
}

$('input[name="opt-type"]').click(()=>{
    crawlAndRenderData();
});

function crawlAndRenderData(){
    let currentProject = globalConfig.getCurrentProject();
    optionView = $('input[name="opt-type"]:checked').val();
    findData(currentProject.projectName, currentProject.server, optionView, currentProject.server.length)
    .then(data=>render.displayData(data, optionView, currentProject.server.length))
}