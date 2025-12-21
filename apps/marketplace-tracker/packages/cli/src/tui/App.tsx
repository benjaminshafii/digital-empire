import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import {
  getQueries,
  getItems,
  getNewItems,
  markAllSeen,
  updateItemStatus,
} from "@marketplace-tracker/core";
import type { Query, Item } from "@marketplace-tracker/core";

type View = "queries" | "items";

export function App() {
  const { exit } = useApp();
  const [view, setView] = useState<View>("queries");
  const [queries, setQueries] = useState<Query[]>([]);
  const [selectedQueryIndex, setSelectedQueryIndex] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  // Load queries on mount
  useEffect(() => {
    setQueries(getQueries());
  }, []);

  // Load items when query selected
  useEffect(() => {
    if (queries.length > 0 && view === "items") {
      const query = queries[selectedQueryIndex];
      setItems(getItems(query.id));
    }
  }, [view, selectedQueryIndex, queries]);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }

    if (input === "?") {
      setShowHelp(!showHelp);
      return;
    }

    if (showHelp) {
      setShowHelp(false);
      return;
    }

    if (view === "queries") {
      if (key.upArrow || input === "k") {
        setSelectedQueryIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow || input === "j") {
        setSelectedQueryIndex((i) => Math.min(queries.length - 1, i + 1));
      } else if (key.return || input === "l") {
        if (queries.length > 0) {
          setSelectedItemIndex(0);
          setView("items");
        }
      }
    } else if (view === "items") {
      if (key.escape || input === "h" || key.backspace) {
        setView("queries");
      } else if (key.upArrow || input === "k") {
        setSelectedItemIndex((i) => Math.max(0, i - 1));
      } else if (key.downArrow || input === "j") {
        setSelectedItemIndex((i) => Math.min(items.length - 1, i + 1));
      } else if (input === "o" && items.length > 0) {
        // Open link in browser
        const item = items[selectedItemIndex];
        import("child_process").then(({ exec }) => exec(`open "${item.link}"`));
      } else if (input === "s" && items.length > 0) {
        // Mark as seen
        const item = items[selectedItemIndex];
        updateItemStatus(item.id, "seen");
        setItems(getItems(queries[selectedQueryIndex].id));
      } else if (input === "c" && items.length > 0) {
        // Mark as contacted
        const item = items[selectedItemIndex];
        updateItemStatus(item.id, "contacted");
        setItems(getItems(queries[selectedQueryIndex].id));
      } else if (input === "x" && items.length > 0) {
        // Hide item
        const item = items[selectedItemIndex];
        updateItemStatus(item.id, "hidden");
        setItems(getItems(queries[selectedQueryIndex].id));
      } else if (input === "a") {
        // Mark all as seen
        markAllSeen(queries[selectedQueryIndex].id);
        setItems(getItems(queries[selectedQueryIndex].id));
      }
    }
  });

  if (showHelp) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Keyboard Shortcuts</Text>
        <Text> </Text>
        <Text bold>Navigation:</Text>
        <Text>  j/k or arrows - Move up/down</Text>
        <Text>  Enter/l       - Select / Enter</Text>
        <Text>  Esc/h         - Go back</Text>
        <Text>  q             - Quit</Text>
        <Text> </Text>
        <Text bold>Item Actions:</Text>
        <Text>  o - Open in browser</Text>
        <Text>  s - Mark as seen</Text>
        <Text>  c - Mark as contacted</Text>
        <Text>  x - Hide item</Text>
        <Text>  a - Mark all as seen</Text>
        <Text> </Text>
        <Text dimColor>Press any key to close</Text>
      </Box>
    );
  }

  if (view === "queries") {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">Marketplace Tracker</Text>
          <Text dimColor> - Press ? for help, q to quit</Text>
        </Box>

        {queries.length === 0 ? (
          <Text dimColor>No queries saved. Run "marketplace-tracker add" to create one.</Text>
        ) : (
          <Box flexDirection="column">
            {queries.map((query, i) => {
              const newItems = getNewItems(query.id);
              const isSelected = i === selectedQueryIndex;
              return (
                <Box key={query.id}>
                  <Text
                    backgroundColor={isSelected ? "blue" : undefined}
                    color={isSelected ? "white" : undefined}
                  >
                    {isSelected ? ">" : " "} {query.name}
                  </Text>
                  {newItems.length > 0 && (
                    <Text color="green" bold> ({newItems.length} new)</Text>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        <Box marginTop={1}>
          <Text dimColor>
            {queries.length > 0 && `${queries.length} queries | `}
            Enter to view items
          </Text>
        </Box>
      </Box>
    );
  }

  // Items view
  const currentQuery = queries[selectedQueryIndex];
  const visibleItems = items.filter((i) => i.status !== "hidden");

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">{currentQuery?.name || "Items"}</Text>
        <Text dimColor> - Press h/Esc to go back, ? for help</Text>
      </Box>

      {visibleItems.length === 0 ? (
        <Text dimColor>No items found. Run "marketplace-tracker run {currentQuery?.name}" to search.</Text>
      ) : (
        <Box flexDirection="column">
          {visibleItems.map((item, i) => {
            const isSelected = i === selectedItemIndex;
            const statusIcon =
              item.status === "new" ? "★" :
              item.status === "contacted" ? "✉" :
              item.status === "purchased" ? "✓" : " ";
            const statusColor =
              item.status === "new" ? "yellow" :
              item.status === "contacted" ? "cyan" :
              item.status === "purchased" ? "green" : undefined;

            return (
              <Box key={item.id} flexDirection="column" marginBottom={isSelected ? 1 : 0}>
                <Box>
                  <Text
                    backgroundColor={isSelected ? "blue" : undefined}
                    color={isSelected ? "white" : undefined}
                  >
                    {isSelected ? ">" : " "}
                    <Text color={statusColor}>{statusIcon}</Text>
                    {" "}{item.title.slice(0, 50)}{item.title.length > 50 ? "..." : ""}
                  </Text>
                  <Text color="green" bold> {item.price}</Text>
                </Box>
                {isSelected && (
                  <Box marginLeft={3} flexDirection="column">
                    <Text dimColor>{item.link}</Text>
                    <Text dimColor>First seen: {new Date(item.firstSeen).toLocaleDateString()}</Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          {visibleItems.length} items | o=open s=seen c=contacted x=hide a=mark all seen
        </Text>
      </Box>
    </Box>
  );
}
