use anyhow::Result;
use clap::{ArgMatches, Command};

use crate::{CliCommand, core::command::command};

mod create;
mod list;
mod publish;
mod publish_template;
mod update;

use create::CreateCommand;
use list::ListCommand;
use publish::PublishCommand;
use publish_template::PublishTemplateCommand;
use update::UpdateCommand;

#[derive(Debug)]
pub(super) struct TemplateCommand {
    list: ListCommand,
    create: CreateCommand,
    update: UpdateCommand,
    publish: PublishCommand,
    publish_template: PublishTemplateCommand,
}

impl TemplateCommand {
    pub(super) fn new() -> Self {
        Self {
            list: ListCommand::new(),
            create: CreateCommand::new(),
            update: UpdateCommand::new(),
            publish: PublishCommand::new(),
            publish_template: PublishTemplateCommand::new(),
        }
    }
}

impl CliCommand for TemplateCommand {
    fn command(&self) -> Command {
        command(
            "template",
            "Manage the app templates your organization publishes",
        )
        .long_about(
            "Manage the app templates your organization publishes.\n\n\
             TWO DIFFERENT THINGS ARE CALLED PUBLISHING, and a template needs both before\n\
             an instance can launch from it:\n\n\
             \x20 `publish`           adds a VERSION — a semver pinned to a git ref. A template\n\
             \x20                     with no version has nothing to deploy.\n\
             \x20 `publish-template`  publishes the TEMPLATE itself, moving it out of `draft`.\n\
             \x20                     `instance create` refuses a draft template outright.\n\n\
             So the full path from nothing to a launchable template is:\n\
             \x20 create  ->  publish  ->  publish-template\n\n\
             `update` is the general form of `publish-template`: it can set the status to any\n\
             of draft/published/retired, and can change the name, description, or Stripe\n\
             product at the same time.",
        )
        .subcommand(self.list.command())
        .subcommand(self.create.command())
        .subcommand(self.update.command())
        .subcommand(self.publish.command())
        .subcommand(self.publish_template.command())
        .subcommand_required(true)
    }

    fn handler(&self, matches: &ArgMatches) -> Result<()> {
        match matches.subcommand() {
            Some(("list", sub_matches)) => self.list.handler(sub_matches),
            Some(("create", sub_matches)) => self.create.handler(sub_matches),
            Some(("update", sub_matches)) => self.update.handler(sub_matches),
            Some(("publish", sub_matches)) => self.publish.handler(sub_matches),
            Some(("publish-template", sub_matches)) => self.publish_template.handler(sub_matches),
            _ => unreachable!(),
        }
    }
}
