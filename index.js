const {
    Plugin
} = require("powercord/entities");
const {
    inject,
    uninject
} = require("powercord/injector");
const {
    getModule,
    React
} = require("powercord/webpack");
const {
    findInReactTree
} = require("powercord/util")
const DownloadPlugin = require("./downloadPlugin");

const Card = require("./Components/Store/Card");
const Settings = require("./Components/Settings");
const DownloadButton = require("./Components/DownloadButton");


module.exports = class PowercordPluginDownloader extends Plugin {
    async startPlugin() {
        this.injectContextMenu();

        if(this.settings.get("beta", false) === false) {
            this.injectMiniPopover();
        } else {
            this.injectStore();
        }
        this.loadStylesheet("style.scss")

        powercord.api.settings.registerSettings("PPD", {
            category: this.entityID,
            label: 'Powercord Plugin Downloader',
            render: (props) => React.createElement(Settings, {
                    ...props
                })
            
        })
    }


    async injectStore() {
        const MessageComponent = await getModule(m => m.default && m.default.displayName === "Message");

        inject("PPD-MessageComponent", MessageComponent, "default", (args, res) => {

            if(this.settings.get("beta", false) === false) return res;
            const props = findInReactTree(res, r => r && r.message);

            if (!props /*|| props.message.channel_id !== '755005584322854972'*/) {
                return res;
            } else {
                return React.createElement(Card, {
                    message: props
                });
            }
        })

        MessageComponent.default.displayName === 'Message'
    }

    async injectMiniPopover() {
        const MiniPopover = await getModule(m => m.default && m.default.displayName === "MiniPopover");
        inject("PPD-MiniPopover", MiniPopover, "default", (args, res) => {
            const props = findInReactTree(res, r => r && r.message && r.setPopout);
            if(!props /*|| props.channel?.id !== "755005584322854972"*/) return res;

            res.props.children.unshift(
                React.createElement(DownloadButton, {
                    message: props.message,
                    main: this
                })
            )
            return res;
        })
        MiniPopover.default.displayName = "MiniPopover";
    }

    async injectContextMenu() {
        const menu = await getModule(["MenuItem"]);
        const mdl = await getModule(
          (m) => m.default && m.default.displayName === "MessageContextMenu"
        );
        inject("PPD-ContextMenu", mdl, "default", ([{ target }], res) => {
          if (!target || !target.href || !target.tagName) return res
          var match = target.href.match(
            /^https?:\/\/(www.)?git(hub|lab).com\/[\w-]+\/[\w-]+\/?/
          );
          if (target.tagName.toLowerCase() === "a" && match) {
            var repoName = target.href.match(/([\w-]+)\/?$/)[0];
            res.props.children.splice(
              4,
              0,
              React.createElement(menu.MenuItem, {
                name: powercord.pluginManager.isInstalled(repoName)
                  ? "Plugin Already Installed"
                  : "Install Plugin",
                separate: true,
                id: "PluginDownloaderContextLink",
                label: powercord.pluginManager.isInstalled(repoName)
                ? "Plugin Already Installed"
                : "Install Plugin",
                action: () => DownloadPlugin(target.href, powercord),
              })
            );
          }
          return res;
        });
        mdl.default.displayName = "MessageContextMenu";
    }


    pluginWillUnload() {
        uninject("PPD-MessageComponent")
        uninject("PPD-MiniPopover");
        uninject("PPD-ContextMenu")
        powercord.api.settings.unregisterSettings("PPD")
    }
};