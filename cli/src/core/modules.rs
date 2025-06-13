use std::collections::HashSet;

use anyhow::{Result, bail};

use crate::constants::{Module, get_service_module_name};

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum IamConfig {
    BetterAuthIam,
    BaseIam,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) enum BillingConfig {
    BaseBilling,
}

#[derive(Debug, PartialEq, Eq, Default)]
pub(crate) struct ModuleConfig {
    pub(crate) iam: Option<IamConfig>,
    pub(crate) billing: Option<BillingConfig>,
}

pub(crate) fn validate_modules(
    modules: &Vec<Module>,
    global_module_config: &mut ModuleConfig,
) -> Result<()> {
    let mut module_conflict_set = HashSet::new();

    for module in modules {
        match module {
            Module::BetterAuthIam => {
                global_module_config.iam = Some(IamConfig::BetterAuthIam);
            }
            Module::BaseIam => {
                global_module_config.iam = Some(IamConfig::BaseIam);
            }
            Module::BaseBilling => {
                global_module_config.billing = Some(BillingConfig::BaseBilling);
            }
        }

        let module_type = get_service_module_name(module);

        if module_conflict_set.contains(&module_type) {
            bail!("Module conflict");
        }

        module_conflict_set.insert(module_type);
    }

    Ok(())
}
