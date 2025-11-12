import React, { useEffect, useState } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Textarea } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";

// get the JSON value at the node path from the full json string
const getValueFromJson = (fullJsonStr: string, path?: NodeData["path"]) => {
  try {
    const full = JSON.parse(fullJsonStr);
    if (!path || path.length === 0) return JSON.stringify(full, null, 2);

    let cur: any = full;
    for (let i = 0; i < path.length; i++) {
      const seg = path[i] as string | number;
      if (cur === undefined || cur === null) return "null";
      cur = cur[seg as any];
    }
    return JSON.stringify(cur, null, 2);
  } catch (e) {
    return "null";
  }
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState<string>("{}");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const jsonStr = useJson.getState().json;
    setEditText(getValueFromJson(jsonStr, nodeData?.path));
    setError(null);
    setEditMode(false);
  }, [nodeData]);

  const setValueAtPath = (obj: any, path: NodeData["path"] | undefined, value: any) => {
    // deep clone the whole object so mutations don't affect original
    const copy = JSON.parse(JSON.stringify(obj));
    if (!path || path.length === 0) return value;
    let cur: any = copy;
    for (let i = 0; i < path.length - 1; i++) {
      const seg = path[i] as string | number;
      if (cur[seg] === undefined) cur[seg] = typeof path[i + 1] === "number" ? [] : {};
      cur = cur[seg];
    }
    const last = path[path.length - 1] as string | number;
    cur[last] = value;
    return copy;
  };

  const handleSave = () => {
    try {
      const parsed = JSON.parse(editText);
      const jsonStr = useJson.getState().json;
      const full = JSON.parse(jsonStr);

      const updated = setValueAtPath(full, nodeData?.path, parsed);
      const updatedStr = JSON.stringify(updated, null, 2);
      useJson.getState().setJson(updatedStr);

      // update the text editor contents too so the left pane shows the change
      // use skipUpdate to avoid triggering debounced update back to useJson
      useFile.getState().setContents({ contents: updatedStr, hasChanges: false, skipUpdate: true });
      setEditMode(false);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Invalid JSON");
    }
  };

  const handleCancel = () => {
    const jsonStr = useJson.getState().json;
    setEditText(getValueFromJson(jsonStr, nodeData?.path));
    setError(null);
    setEditMode(false);
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="xs" align="center">
              {!editMode ? (
                <Button size="xs" variant="default" onClick={() => setEditMode(true)}>
                  Edit
                </Button>
              ) : (
                <>
                  <Button size="xs" color="green" onClick={handleSave}>
                    Save
                  </Button>
                  <Button size="xs" variant="outline" color="gray" onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              )}
              <CloseButton onClick={onClose} />
            </Flex>
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {!editMode ? (
              <CodeHighlight
                code={getValueFromJson(useJson.getState().json, nodeData?.path)}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            ) : (
              <Textarea
                value={editText}
                onChange={e => setEditText(e.currentTarget.value)}
                minRows={4}
                styles={{ input: { fontFamily: "monospace" } }}
              />
            )}
            {error ? <Text fz="xs" c="red">{error}</Text> : null}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
