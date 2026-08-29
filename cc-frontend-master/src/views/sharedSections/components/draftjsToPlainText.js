export function draftjsToText(draftjsContent) {
  try {
    // If the content is already an object, use it directly
    // Otherwise, try to parse it as JSON
    const content =
      typeof draftjsContent === "string"
        ? JSON.parse(draftjsContent)
        : draftjsContent;

    // Extract text from each block and join with newlines
    return content.blocks.map((block) => block.text).join("\n");
  } catch (error) {
    // If parsing fails, return the original content as is
    return typeof draftjsContent === "string"
      ? draftjsContent
      : JSON.stringify(draftjsContent);
  }
}
