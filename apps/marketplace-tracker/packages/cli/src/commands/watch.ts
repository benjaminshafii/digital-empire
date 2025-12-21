import { Command } from "commander";
import React from "react";
import { render } from "ink";
import { App } from "../tui/App";

export const watchCommand = new Command("watch")
  .description("Open interactive dashboard to view and manage items")
  .action(async () => {
    render(React.createElement(App));
  });
