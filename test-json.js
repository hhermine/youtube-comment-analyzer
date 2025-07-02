const { GoogleGenAI } = require("@google/genai");

async function testJSON() {
  try {
    console.log("Testing JSON output...");

    const ai = new GoogleGenAI({
      vertexai: true,
      project: "your-project-id-here",
      location: "global",
    });

    const req = {
      model: "gemini-2.5-pro",
      contents: [
        {
          role: "user",
          parts: [{ text: 'Return this JSON: {"test": "success"}' }],
        },
      ],
      config: {
        maxOutputTokens: 100,
        temperature: 0.1,
        topP: 0.8,
        seed: 0,
      },
    };

    console.log("Making JSON request...");
    let response = "";
    const streamingResp = await ai.models.generateContentStream(req);

    for await (const chunk of streamingResp) {
      if (chunk.text) {
        response += chunk.text;
        process.stdout.write(chunk.text);
      }
    }

    console.log("\n\nResponse:", response);
    console.log("Length:", response.length);

    // Try to parse JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log("Found JSON match:", jsonMatch[0]);
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log("Successfully parsed JSON:", parsed);
      } catch (e) {
        console.log("JSON parse failed:", e.message);
      }
    } else {
      console.log("No JSON found in response");
    }
  } catch (error) {
    console.error("Test failed:", error);
    console.error("Error details:", error.message);
  }
}

testJSON();

// Test JSON extraction with truncated response
const testTruncatedResponse = `\`\`\`json\n{\n  "sentiment": "Positive",\n  "topics": [\n    "Rickrolling (the meme/prank)",\n    "Genuine appreciation for the song`;

console.log("Testing truncated response:", testTruncatedResponse);

let jsonMatch = testTruncatedResponse.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  // Try to find JSON in code blocks (```json)
  jsonMatch = testTruncatedResponse.match(/```json\s*(\{[\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonMatch = [jsonMatch[0], jsonMatch[1]];
  }
}

if (!jsonMatch) {
  // Try to find any code block with JSON
  jsonMatch = testTruncatedResponse.match(/```\s*(\{[\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonMatch = [jsonMatch[0], jsonMatch[1]];
  }
}

if (!jsonMatch) {
  // Try to find incomplete JSON and complete it
  const incompleteMatch = testTruncatedResponse.match(/\{[\s\S]*/);
  if (incompleteMatch) {
    let incompleteJson = incompleteMatch[0];
    console.log(
      "Found incomplete JSON, attempting to complete:",
      incompleteJson
    );
    // Count open braces and close them
    const openBraces = (incompleteJson.match(/\{/g) || []).length;
    const closeBraces = (incompleteJson.match(/\}/g) || []).length;
    const missingBraces = openBraces - closeBraces;
    console.log(
      `Open braces: ${openBraces}, Close braces: ${closeBraces}, Missing: ${missingBraces}`
    );
    // Handle incomplete strings in arrays
    let lines = incompleteJson.split("\n");
    if (lines.length > 0) {
      let lastLine = lines[lines.length - 1];
      // If the last line is an incomplete string (odd number of quotes)
      const quoteCount = (lastLine.match(/"/g) || []).length;
      if (quoteCount % 2 === 1) {
        // Add a closing quote
        lastLine += '"';
        lines[lines.length - 1] = lastLine;
        console.log(
          "Closed incomplete string in last array element:",
          lastLine
        );
      }
      // Only add a comma if the last line is a string and not empty or a bracket
      if (
        lastLine.trim().length > 0 &&
        !lastLine.trim().endsWith("]") &&
        !lastLine.trim().endsWith("}")
      ) {
        if (!lastLine.trim().endsWith(",")) {
          lastLine += ",";
          lines[lines.length - 1] = lastLine;
          console.log("Added comma to last array element:", lastLine);
        }
      }
    }
    incompleteJson = lines.join("\n");
    // If we have an incomplete array, close it
    const openArrays = (incompleteJson.match(/\[/g) || []).length;
    const closeArrays = (incompleteJson.match(/\]/g) || []).length;
    const missingArrays = openArrays - closeArrays;
    if (missingArrays > 0) {
      for (let i = 0; i < missingArrays; i++) {
        incompleteJson += "]";
      }
      console.log(`Closed ${missingArrays} missing array brackets`);
    }
    // Add missing closing braces for objects
    if (missingBraces > 0) {
      for (let i = 0; i < missingBraces; i++) {
        incompleteJson += "}";
      }
      console.log(`Closed ${missingBraces} missing object braces`);
    }
    // Final pass: remove any trailing comma before ] or }
    incompleteJson = incompleteJson.replace(/,\s*\]/g, "]");
    incompleteJson = incompleteJson.replace(/,\s*\}/g, "}");
    jsonMatch = [incompleteJson, incompleteJson];
    console.log("Completed JSON:", incompleteJson);
  }
}

if (jsonMatch) {
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    console.log("Successfully parsed JSON:", parsed);
  } catch (e) {
    console.log("Failed to parse JSON:", e.message);
    console.log("JSON string:", jsonMatch[1]);
  }
} else {
  console.log("No JSON found");
}
