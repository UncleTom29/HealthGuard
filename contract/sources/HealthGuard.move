// File: sources/HealthGuard.move
module HealthGuard::AlertManager {
    use sui::object::{UID, Self as object};
    use sui::tx_context::TxContext;
    use std::vector;   // Import the vector module from the standard library

    /// The Alert resource represents an anonymized alert
    struct Alert has key, store {  // Add `key` ability
        id: UID,
        timestamp: u64,
        alert_message: vector<u8>,
    }

    /// The AlertManager resource holds a list of alerts
    struct AlertManager has key {
        id: UID,
        alerts: vector<Alert>,
    }

    /// Initializes and returns a new AlertManager resource
    public fun initialize_alert_manager(ctx: &mut TxContext): AlertManager {
        AlertManager {
            id: object::new(ctx),
            alerts: vector::empty<Alert>(),
        }
    }

    /// Logs an alert by pushing a new Alert into the AlertManager
    public fun log_alert(
        manager: &mut AlertManager,
        timestamp: u64,
        alert_message: vector<u8>,
        ctx: &mut TxContext
    ) {
        let new_alert = Alert {
            id: object::new(ctx),
            timestamp,
            alert_message
        };
        vector::push_back(&mut manager.alerts, new_alert);  // Use the variables
    }
}