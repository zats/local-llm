<!--
Downloaded via https://llm.codes by @steipete on June 29, 2025 at 09:06 PM
Source URL: https://developer.apple.com/documentation/foundationmodels
Total pages processed: 181
URLs filtered: Yes
Content de-duplicated: Yes
Availability strings filtered: Yes
Code blocks only: No
-->

# https://developer.apple.com/documentation/foundationmodels

Framework

# Foundation Models

Perform tasks with the on-device model that specializes in language understanding, structured output, and tool calling.

## Overview

The Foundation Models framework provides access to Apple’s on-device large language model that powers Apple Intelligence to help you perform intelligent tasks specific to your use case. The text-based on-device model identifies patterns that allow for generating new text that’s appropriate for the request you make, and it can make decisions to call code you write to perform specialized tasks.

Generate text content based on requests you make. The on-device model excels at a diverse range of text generation tasks, like summarization, entity extraction, text understanding, refinement, dialog for games, generating creative content, and more.

Generate entire Swift data structures with guided generation. With the `@Generable` macro, you can define custom data structures and the framework provides strong guarantees that the model generates instances of your type.

To expand what the on-device foundation model can do, use `Tool` to create custom tools that the model can call to assist with handling your request. For example, the model can call a tool that searches a local or online database for information, or calls a service in your app.

To use the on-device language model, people need to turn on Apple Intelligence on their device. For a list of supported devices, see Apple Intelligence.

For more information about acceptable usage of the Foundation Models framework, see Acceptable use requirements for the Foundation Models framework.

## Topics

### Essentials

Generating content and performing tasks with Foundation Models

Enhance the experience in your app by prompting an on-device large language model.

Improving safety from generative model output

Create generative experiences that appropriately handle sensitive inputs and respect people.

Adding intelligent app features with generative models

Build robust apps with guided generation and tool calling by adopting the Foundation Models framework.

`class SystemLanguageModel`

An on-device large language model capable of text generation tasks.

`struct UseCase`

A type that represents the use case for prompting.

### Prompting

`class LanguageModelSession`

An object that represents a session that interacts with a large language model.

`struct Instructions`

Instructions define the model’s intended behavior on prompts.

`struct Prompt`

A prompt from a person to the model.

`struct Transcript`

A transcript that documents interactions with a language model.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

### Guided generation

Generating Swift data structures with guided generation

Create robust apps by describing output you want programmatically.

`protocol Generable`

A type that the model uses when responding to prompts.

### Tool calling

Expanding generation with tool calling

Build tools that enable the model to perform tasks that are specific to your use case.

Generate dynamic game content with guided generation and tools

Make gameplay more lively with AI generated dialog and encounters personalized to the player.

`protocol Tool`

A tool that a model can call to gather information at runtime or perform side effects.

### Feedback

`struct LanguageModelFeedbackAttachment`

Feedback appropriate for attaching to Feedback Assistant.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/tool

- Foundation Models
- Tool Beta

Protocol

# Tool

A tool that a model can call to gather information at runtime or perform side effects.

protocol Tool : Sendable

## Mentioned in

Generating content and performing tasks with Foundation Models

Expanding generation with tool calling

## Overview

Tool calling gives the model the ability to call your code to incorporate up-to-date information like recent events and data from your app. A tool includes a name and a description that the framework puts in the prompt to let the model decide when and how often to call your tool.

struct FindContacts: Tool {
let name = "findContacts"
let description = "Find a specific number of contacts"

@Generable
struct Arguments {
@Guide(description: "The number of contacts to get", .range(1...10))
let count: Int
}

var contacts: [CNContact] = []
// Fetch a number of contacts using the arguments.
let formattedContacts = contacts.map {
"\($0.givenName) \($0.familyName)"
}
return ToolOutput(GeneratedContent(properties: ["contactNames": formattedContacts]))
}
}

Tools must conform to `Sendable` so the framework can run them concurrently. If the model needs to pass the output of one tool as the input to another, it executes back-to-back tool calls.

You control the life cycle of your tool, so you can track the state of it between calls to the model. For example, you might store a list of database records that you don’t want to reuse between tool calls.

## Topics

### Invoking a tool

A language model will call this method when it wants to leverage this tool.

**Required**

`struct ToolOutput`

A structure that contains the output a tool generates.

`associatedtype Arguments : ConvertibleFromGeneratedContent`

The arguments that this tool should accept.

### Getting the tool properties

`var description: String`

A natural language description of when and how to use the tool.

`var includesSchemaInInstructions: Bool`

If true, the model’s name, description, and parameters schema will be injected into the instructions of sessions that leverage this tool.

**Required** Default implementation provided.

`var name: String`

A unique name for the tool, such as “get\_weather”, “toggleDarkMode”, or “search contacts”.

`var parameters: GenerationSchema`

A schema for the parameters this tool accepts.

## Relationships

### Inherits From

- `Sendable`
- `SendableMetatype`

## See Also

### Tool calling

Build tools that enable the model to perform tasks that are specific to your use case.

Generate dynamic game content with guided generation and tools

Make gameplay more lively with AI generated dialog and encounters personalized to the player.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models

- Foundation Models
- Generating content and performing tasks with Foundation Models

Article

# Generating content and performing tasks with Foundation Models

Enhance the experience in your app by prompting an on-device large language model.

## Overview

The Foundation Models framework lets you tap into the on-device large models at the core of Apple Intelligence. You can enhance your app by using generative models to create content or perform tasks. The framework supports language understanding and generation based on models capabilities like text extraction and summarization that you can use to:

- Generate a title, description, or tags for content

- Generate a list of search suggestions relevant to your app

- Transform product reviews into structured data you can visualize

- Invoke your own tools to assist the model with performing app-specific tasks

## Check for availability

Check model availability by creating an instance of `SystemLanguageModel` with the `default` property. The `default` property provides the same model Apple Intelligence uses, and supports text generation.

Model availability depends on device factors like:

- The device must support Apple Intelligence.

- The device must have Apple Intelligence turned on in System Settings.

- The device must have sufficient battery and not be in Game Mode.

Always verify model availability first, and plan for a fallback experience in case the model is unavailable.

struct GenerativeView: View {
// Create a reference to the system language model.
private var model = SystemLanguageModel.default

var body: some View {
switch model.availability {
case .available:
// Show your intelligence UI.
case .unavailable(.deviceNotEligible):
// Show an alternative UI.
case .unavailable(.appleIntelligenceNotEnabled):
// Ask the person to turn on Apple Intelligence.
case .unavailable(.modelNotReady):
// The model isn't ready because it's downloading or because of other system reasons.
case .unavailable(let other):
// The model is unavailable for an unknown reason.
}
}
}

## Create a session

After confirming that the model is available, create a `LanguageModelSession` object to call the model. For a single-turn interaction, create a new session each time you call the model:

// Create a session with the system model.
let session = LanguageModelSession()

For a multiturn interaction — where the model retains some knowledge of what it produced — reuse the same session each time you call the model.

## Provide a prompt to the model

A `Prompt` is an input that the model responds to. Prompt engineering is the art of designing high-quality prompts so that the model generates a best possible response for the request you make. A prompt can be as short as “hello”, or as long as multiple paragraphs. The process of designing a prompt involves a lot of exploration to discover the best prompt, and involves optimizing prompt length and writing style.

When thinking about the prompt you want to use in your app, consider using conversational language in the form of a question or command. For example, “What’s a good month to visit Paris?” or “Generate a food truck menu.”

Write prompts that focus on a single and specific task, like “Write a profile for the dog breed Siberian Husky”. When a prompt is long and complicated, the model takes longer to respond, and may respond in unpredictable ways. If you have a complex generation task in mind, break the task down into a series of specific prompts.

You can refine your prompt by telling the model exactly how much content it should generate. A prompt like, “Write a profile for the dog breed Siberian Husky” often takes a long time to process as the model generates a full multi-paragraph essay. If you specify “using three sentences”, it speeds up processing and generates a concise summary. Use phrases like “in a single sentence” or “in a few words” to shorten the generation time and produce shorter text.

// Generate a longer response for a specific command.
let simple = "Write me a story about pears."

// Quickly generate a concise response.
let quick = "Write the profile for the dog breed Siberian Husky using three sentences."

## Provide instructions to the model

`Instructions` help steer the model in a way that fits the use case of your app. The model obeys prompts at a lower priority than the instructions you provide. When you provide instructions to the model, consider specifying details like:

- What the model’s role is; for example, “You are a mentor,” or “You are a movie critic”.

- What the model should do, like “Help the person extract calendar events,” or “Help the person by recommending search suggestions”.

- What the style preferences are, like “Respond as briefly as possible”.

- What the possible safety measures are, like “Respond with ‘I can’t help with that’ if you’re asked to do something dangerous”.

Use content you trust in instructions because the model follows them more closely than the prompt itself. When you initialize a session with instructions, it affects all prompts the model responds to in that session. Instructions can also include example responses to help steer the model. When you add examples to your prompt, you provide the model with a template that shows the model what a good response looks like.

## Generate a response

To call the model with a prompt, call `respond(to:options:isolation:)` on your session. The response call is asynchronous because it may take a few seconds for Foundation Models to generate the response.

let instructions = """
Suggest five related topics. Keep them concise (three to seven words) and make sure they \
build naturally from the person's topic.
"""

let session = LanguageModelSession(instructions: instructions)

let prompt = "Making homemade bread"
let response = try await session.respond(to: prompt)

Instead of working with raw string output from the model, the framework offers guided generation to generate a custom Swift data structure you define. For more information about guided generation, see Generating Swift data structures with guided generation.

When you make a request to the model, you can provide custom tools to help the model complete the request. If the model determines that a `Tool` can assist with the request, the framework calls your `Tool` to perform additional actions like retrieving content from your local database. For more information about tool calling, see Expanding generation with tool calling

## Tune generation options and optimize performance

To get the best results for your prompt, experiment with different generation options. `GenerationOptions` affects the runtime parameters of the model, and you can customize them for every request you make.

// Customize the temperature to increase creativity.
let options = GenerationOptions(temperature: 2.0)

let session = LanguageModelSession()

let prompt = "Write me a story about coffee."
let response = try await session.respond(
to: prompt,
options: options
)

When you test apps that use the framework, use Xcode Instruments to understand more about the requests you make, like the time it takes to perform a request. When you make a request, you can access the `Transcript` entries that describe the actions the model takes during your `LanguageModelSession`.

## See Also

### Essentials

Improving safety from generative model output

Create generative experiences that appropriately handle sensitive inputs and respect people.

Adding intelligent app features with generative models

Build robust apps with guided generation and tool calling by adopting the Foundation Models framework.

`class SystemLanguageModel`

An on-device large language model capable of text generation tasks.

Beta

`struct UseCase`

A type that represents the use case for prompting.

---

# https://developer.apple.com/documentation/foundationmodels/improving-safety-from-generative-model-output

- Foundation Models
- Improving safety from generative model output

Article

# Improving safety from generative model output

Create generative experiences that appropriately handle sensitive inputs and respect people.

## Overview

Generative AI models have powerful creativity, but with this creativity comes the risk of unintended or unexpected results. For any generative AI feature, safety needs to be an essential part of your design.

The Foundation Models framework has two base layers of safety. First, the framework uses an on-device language model that’s trained to handle sensitive topics with care. Second, the framework uses _guardrails_ that Apple developed with a responsible AI approach. These guardrails flag sensitive content, such as self-harm, violence, and adult sexual material, from model input and output. Since safety risks are often contextual, some harms may be able to bypass both built-in framework safety layers. Additional safety layers you design specific to your app are vital. When developing your feature, you’ll need to decide what is acceptable or might be harmful in your generative AI feature, based on your app’s use case, cultural context, and audience.

## Handle guardrail errors

When you send a prompt to the model, the `Guardrails` check the input prompt and the model’s output. If either fails the guardrail’s safety check, the model session throws a `LanguageModelSession.GenerationError.guardrailViolation(_:)` error:

do {
let session = LanguageModelSession()
let topic = // A potentially harmful topic.
let prompt = "Write a respectful and funny story about \(topic)."
let response = try await session.respond(to: prompt)
} catch LanguageModelSession.GenerationError.guardrailViolation {
// Handle the safety error.
}

If you encounter a guardrail violation error for any built-in prompt in your app, experiment with re-phrasing the prompt to determine which phrases are activating the guardrails, and avoid those phrases. If the error is thrown in response to a prompt created by someone using your app, give people a clear message that explains the issue. For example, you might say “Sorry, this feature isn’t designed to handle that kind of input” and offer people the opportunity to try a different prompt.

## Build boundaries on input and output

Safety risks increase when a prompt includes direct input from a person using your app, or from an unverified external source, like a webpage. An untrusted source makes it difficult to anticipate what the input contains. Whether accidentally or on purpose, someone could input sensitive content that causes the model to respond poorly.

Whenever possible, avoid open input in prompts and place boundaries for controlling what the input can be. This approach helps when you want generative content to stay within the bounds of a particular topic or task. For the highest level of safety on input, give people a fixed set of prompts to choose from. This gives you the highest certainty that sensitive content won’t make its way into your app:

enum TopicOptions {
case family
case nature
case work
}
let topicChoice = TopicOptions.nature
let prompt = """
Generate a wholesome and empathetic journal prompt that helps \
this person reflect on \(topicChoice)
"""

If your app allows people to freely input a prompt, placing boundaries on the output can also offer stronger safety guarantees. Using guided generation, create an enumeration to restrict the model’s output to a set of predefined options designed to be safe no matter what:

@Generable
enum Breakfast {
case waffles
case pancakes
case bagels
case eggs
}
let session = LanguageModelSession()
let userInput = "I want something sweet."
let prompt = "Pick the ideal breakfast for request: \(userInput)"
let response = try await session.respond(to: prompt, generating: Breakfast.self)

For more information about guided generation, see Generating Swift data structures with guided generation.

## Instruct the model for added safety

Consider adding detailed session `Instructions` that tell the model how to handle sensitive content. The language model prioritizes following its instructions over any prompt, so instructions are an effective tool for improving safety and overall generation quality. Use uppercase words to emphasize the importance of certain phrases for the model:

do {
let instructions = """
ALWAYS respond in a respectful way. \
If someone asks you to generate content that might be sensitive, \
you MUST decline with 'Sorry, I can't do that.'
"""
let session = LanguageModelSession(instructions: instructions)
let prompt = // Open input from a person using the app.
let response = try await session.respond(to: prompt)
} catch LanguageModelSession.GenerationError.guardrailViolation {
// Handle the safety error.
}

If you want to include open-input from people, instructions for safety are recommended. For an additional layer of safety, use a format string in normal prompts that wraps people’s input in your own content that specifies how the model should respond:

let userInput = // The input a person enters in the app.
let prompt = """
Generate a wholesome and empathetic journal prompt that helps \
this person reflect on their day. They said: \(userInput)
"""

## Add a deny list of blocked terms

If you allow prompt input from people or outside sources, consider adding your own deny list of terms. A deny list is anything you don’t want people to be able to input to your app, including unsafe terms, names of people or products, or anything that’s not relevant to the feature you provide. Implement a deny list similarly to guardrails by creating a function that checks the input and the model output:

let session = LanguageModelSession()
let userInput = // The input a person enters in the app.
let prompt = "Generate a wholesome story about: \(userInput)"

// A function you create that evaluates whether the input
// contains anything in your deny list.
if verifyText(prompt) {
let response = try await session.respond(to: prompt)

// Compare the output to evaluate whether it contains anything in your deny list.
if verifyText(response.content) {
return response
} else {
// Handle the unsafe output.
}
} else {
// Handle the unsafe input.
}

A deny list can be a simple list of strings in your code that you distribute with your app. Alternatively, you can host a deny list on a server so your app can download the latest deny list when it’s connected to the network. Hosting your deny list allows you to update your list when you need to and avoids requiring a full app update if a safety issue arise.

## Create a risk assessment

Conduct a risk assessment to proactively address what might go wrong. Risk assessment is an exercise that helps you brainstorm potential safety risks in your app and map each risk to an actionable mitigation. You can write a risk assessment in any format that includes these essential elements:

- List each AI feature in your app.

- For each feature, list possible safety risks that could occur, even if they seem unlikely.

- For each safety risk, score how serious the harm would be if that thing occurred, from mild to critical.

- For each safety risk, assign a strategy for how you’ll mitigate the risk in your app.

For example, an app might include one feature with the fixed-choice input pattern for generation and one feature with the open-input pattern for generation, which is higher safety risk:

| Feature | Harm | Severity | Mitigation |
| --- | --- | --- | --- |
| Player can input any text to chat with nonplayer characters in the coffee shop. | A character might respond in an insensitive or harmful way. | Critical | Instructions and prompting to steer characters responses to be safe; safety testing. |
| Image generation of an imaginary dream customer, like a fairy or a frog. | Generated image could look weird or scary. | Mild | Include in the prompt examples of images to generate that are cute and not scary; safety testing. |
| Player can make a coffee from a fixed menu of options. | None identified. | | |
| Generate a review of the coffee the player made, based on the customer’s order. | Review could be insulting. | Moderate | Instructions and prompting to encourage posting a polite review; safety testing. |

Besides obvious harms, like a poor-quality model output, think about how your generative AI feature could affect people, including real world scenarios where someone might act based on information generated by your app.

## Write and maintain adversarial safety tests

Although most people will interact with your app in respectful ways, it’s important to anticipate possible failure modes where certain input or contexts could cause the model to generate something harmful. Especially if your app takes input from people, test your experience’s safety on input like:

- Input that is nonsensical, snippets of code, or random characters.

- Input that includes sensitive content.

- Input that includes controversial topics.

- Vague or unclear input that could be misinterpreted.

Create a list of potentially harmful prompt inputs that you can run as part of your app’s tests. Include every prompt in your app — even safe ones — as part of your app testing. For each prompt test, log the timestamp, full input prompt, the model’s response, and whether it activates any built-in safety or mitigations you’ve included in your app. When starting out, manually read the model’s response on all tests to ensure it meets your design and safety goals. To scale your tests, consider using a frontier LLM to auto-grade the safety of each prompt. Building a test pipeline for prompts and safety is a worthwhile investment for tracking changes in how your app responds over time.

Someone might purposefully attempt to break your feature or produce bad output — especially someone who won’t be harmed by their actions. But keep in mind that it’s very important to identify cases where someone could accidentally cause harm to self or others during normal app use.

Don’t engage in any testing that could cause you or others harm. Apple’s built-in responsible AI and safety measures, like safety guardrails, are built by experts with extensive training and support. These built-in measures aim to block egregious harms, allowing you to focus on the borderline harmful cases that need your judgement. Before conducting any safety testing, ensure that you’re in a safe location and that you have the health and well-being support you need.

## Report safety concerns

Somewhere in your app, it’s important to include a way that people can report potentially harmful content. Continuously monitor the feedback you receive, and be responsive to quickly handling any safety issues that arise. If someone reports a safety concern that you believe isn’t being properly handled by Apple’s built-in guardrails, report it to Apple with Feedback Assistant.

The Foundation Models framework offers utilities for feedback. Use `LanguageModelFeedbackAttachment` to retrieve language model session transcripts from people using your app. After collecting feedback, you can serialize it into a JSONL file and include it in the report you send with Feedback Assistant.

## Monitor safety for model or guardrail updates

Apple releases updates to the system model as part of regular OS updates. If you participate in the developer beta program you can test your app with new model version ahead of people using your app. When the model updates, it’s important to re-run your full prompt tests in addition to your adversarial safety tests because the model’s response may change. Your risk assessment can help you track any change to safety risks in your app.

Apple may update the built-in guardrails at any time outside of the regular OS update cycle. This is done to rapidly respond, for example, to reported safety concerns that require a fast response. Include all of the prompts you use in your app in your test suite, and run tests regularly to identify when prompts start activating the guardrails.

## See Also

### Essentials

Generating content and performing tasks with Foundation Models

Enhance the experience in your app by prompting an on-device large language model.

Adding intelligent app features with generative models

Build robust apps with guided generation and tool calling by adopting the Foundation Models framework.

`class SystemLanguageModel`

An on-device large language model capable of text generation tasks.

Beta

`struct UseCase`

A type that represents the use case for prompting.

---

# https://developer.apple.com/documentation/foundationmodels/adding-intelligent-app-features-with-generative-models

- Foundation Models
- Adding intelligent app features with generative models Beta

Sample Code

# Adding intelligent app features with generative models

Build robust apps with guided generation and tool calling by adopting the Foundation Models framework.

Download

Xcode 26.0+Beta

## Overview

### Configure the sample code project

To configure the sample code project, do the following in Xcode:

1. Open the sample with the latest version of Xcode.

2. Set the developer team for all targets to let Xcode automatically manage the provisioning profile. For more information, see Set the bundle ID and Assign the project to a team.

## See Also

### Essentials

Generating content and performing tasks with Foundation Models

Enhance the experience in your app by prompting an on-device large language model.

Improving safety from generative model output

Create generative experiences that appropriately handle sensitive inputs and respect people.

`class SystemLanguageModel`

An on-device large language model capable of text generation tasks.

Beta

`struct UseCase`

A type that represents the use case for prompting.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel

- Foundation Models
- SystemLanguageModel Beta

Class

# SystemLanguageModel

An on-device large language model capable of text generation tasks.

final class SystemLanguageModel

## Mentioned in

Generating content and performing tasks with Foundation Models

## Overview

The `SystemLanguageModel` refers to the on-device text foundation model that powers Apple Intelligence. Use `default` to access the base version of the model and perform general-purpose text generation tasks. To access a specialized version of the model, initialize the model with `SystemLanguageModel.UseCase` to perform tasks like `contentTagging`.

Verify the model availability before you use the model. Model availability depends on device factors like:

- The device must support Apple Intelligence

- Apple Intelligence must be turned on in System Settings

- The device must have sufficient battery

- The device cannot be in Game Mode

Use `SystemLanguageModel.Availability` to change what your app shows to people based on the availability condition:

struct GenerativeView: View {
// Create a reference to the system language model.
private var model = SystemLanguageModel.default

var body: some View {
switch model.availability {
case .available:
// Show your intelligence UI.
case .unavailable(.deviceNotEligible):
// Show an alternative UI.
case .unavailable(.appleIntelligenceNotEnabled):
// Ask the person to turn on Apple Intelligence.
case .unavailable(.modelNotReady):
// The model isn't ready because it's downloading or because of other system reasons.
case .unavailable(let other):
// The model is unavailable for an unknown reason.
}
}
}

## Topics

### Loading the model with a use case

`convenience init(useCase: SystemLanguageModel.UseCase)`

Creates a system language model for a specific use case.

`struct UseCase`

A type that represents the use case for prompting.

### Loading the model with an adapter

`convenience init(adapter: SystemLanguageModel.Adapter)`

Creates the base version of the model with an adapter.

`struct Adapter`

Specializes the system language model for custom use cases.

### Checking model availability

`var isAvailable: Bool`

A convenience getter to check if the system is entirely ready.

`var availability: SystemLanguageModel.Availability`

The availability of the language model.

`enum Availability`

The availability status for a specific system language model.

### Getting the default model

``static let `default`: SystemLanguageModel``

The base version of the model.

### Instance Properties

Languages supported by the model.

## Relationships

### Conforms To

- `Copyable`
- `Observable`
- `Sendable`
- `SendableMetatype`

## See Also

### Essentials

Enhance the experience in your app by prompting an on-device large language model.

Improving safety from generative model output

Create generative experiences that appropriately handle sensitive inputs and respect people.

Adding intelligent app features with generative models

Build robust apps with guided generation and tool calling by adopting the Foundation Models framework.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase

- Foundation Models
- SystemLanguageModel
- SystemLanguageModel.UseCase Beta

Structure

# SystemLanguageModel.UseCase

A type that represents the use case for prompting.

struct UseCase

## Topics

### Getting the use cases

`static let general: SystemLanguageModel.UseCase`

A use case for general prompting.

`static let contentTagging: SystemLanguageModel.UseCase`

A use case for content tagging.

### Comparing use cases

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Equatable`
- `Sendable`
- `SendableMetatype`

## See Also

### Essentials

Generating content and performing tasks with Foundation Models

Enhance the experience in your app by prompting an on-device large language model.

Improving safety from generative model output

Create generative experiences that appropriately handle sensitive inputs and respect people.

Adding intelligent app features with generative models

Build robust apps with guided generation and tool calling by adopting the Foundation Models framework.

`class SystemLanguageModel`

An on-device large language model capable of text generation tasks.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession

- Foundation Models
- LanguageModelSession Beta

Class

# LanguageModelSession

An object that represents a session that interacts with a large language model.

final class LanguageModelSession

## Mentioned in

Generating content and performing tasks with Foundation Models

Generating Swift data structures with guided generation

## Overview

A session is a single context that you use to generate content with, and maintains state between requests. You can reuse the existing instance or create a new one each time you call the model. When you create a session you can provide instructions that tells the model what its role is and provides guidance on how to respond.

let session = LanguageModelSession(instructions: """
You are a motivational workout coach that provides quotes to inspire \
and motivate athletes.
"""
)

let prompt = "Generate a motivational quote for my next workout."
let response = try await session.respond(to: prompt)

The framework records each call to the model in a `Transcript` that includes all prompts and responses. If your session exceeds the available context size, it throws an `LanguageModelSession.GenerationError.exceededContextWindowSize(_:)`

## Topics

### Creating a session

`convenience(model:guardrails:tools:instructions:)`

Start a new session in blank slate state with instructions builder.

`class SystemLanguageModel`

An on-device large language model capable of text generation tasks.

`struct Guardrails`

Guardrails flag sensitive content from model input and output.

`protocol Tool`

A tool that a model can call to gather information at runtime or perform side effects.

`struct Instructions`

Instructions define the model’s intended behavior on prompts.

### Creating a session from a transcript

[`convenience init(model: SystemLanguageModel, guardrails: LanguageModelSession.Guardrails, tools: [any Tool], transcript: Transcript)`](https://developer.apple.com/documentation/foundationmodels/languagemodelsession/init(model:guardrails:tools:transcript:))

Start a session by rehydrating from a transcript.

`struct Transcript`

A transcript that documents interactions with a language model.

### Preloading the model

`func prewarm()`

Requests that the system eagerly load the resources required for this session into memory.

### Inspecting session properties

`var isResponding: Bool`

A Boolean value that indicates a response is being generated.

`var transcript: Transcript`

A full history of interactions, including user inputs and model responses.

### Generating a request

Produces a generable object as a response to a prompt.

Produces a response to a prompt.

Produces a generated content type as a response to a prompt and schema.

`func respond(to:generating:includeSchemaInPrompt:options:isolation:)`

`func respond(to:options:isolation:)`

`func respond(to:schema:includeSchemaInPrompt:options:isolation:)`

`struct Prompt`

A prompt from a person to the model.

`struct Response`

A structure that stores the output of a response call.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

### Streaming a response

`func streamResponse(to:options:)`

Produces a response stream to a prompt.

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

Produces a response stream to a prompt and schema.

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct ResponseStream`

A structure that stores the output of a response stream.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

### Getting the error types

`enum GenerationError`

An error that occurs while generating a response.

`struct ToolCallError`

An error that occurs while a system language model is calling a tool.

## Relationships

### Conforms To

- `Copyable`
- `Observable`
- `Sendable`
- `SendableMetatype`

## See Also

### Prompting

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/instructions

- Foundation Models
- Instructions Beta

Structure

# Instructions

Instructions define the model’s intended behavior on prompts.

struct Instructions

## Mentioned in

Generating content and performing tasks with Foundation Models

Improving safety from generative model output

## Overview

Instructions are typically provided by you to define the role and behavior of the model. In the code below, the instructions specify that the model replies with topics rather than, for example, a recipe:

let instructions = """
Suggest related topics. Keep them concise (three to seven words) and make sure they \
build naturally from the person's topic.
"""

let session = LanguageModelSession(instructions: instructions)

let prompt = "Making homemade bread"
let response = try await session.respond(to: prompt)

Apple trains the model to obey instructions over any commands it receives in prompts, so don’t include untrusted content in instructions. For more on how instructions impact generation quality and safety, see Improving safety from generative model output.

## Topics

### Creating instructions

`init(_:)`

`struct InstructionsBuilder`

A type that represents an instructions builder.

`protocol InstructionsRepresentable`

Conforming types represent instructions.

## Relationships

### Conforms To

- `Copyable`
- `InstructionsRepresentable`

## See Also

### Prompting

`class LanguageModelSession`

An object that represents a session that interacts with a large language model.

Beta

`struct Prompt`

A prompt from a person to the model.

`struct Transcript`

A transcript that documents interactions with a language model.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/prompt

- Foundation Models
- Prompt Beta

Structure

# Prompt

A prompt from a person to the model.

struct Prompt

## Mentioned in

Generating content and performing tasks with Foundation Models

## Overview

Prompts can contain content written by you, and outside source, or input directly from people using your app. You can initialize a `Prompt` from a string literal:

let prompt = Prompt("What are miniature schnauzers known for?")

To dynamically control the prompt’s content based on your app’s state, build a `Prompt` as a computed property. The code below shows if the Boolean is `true`, the prompt includes a second line of text:

let responseShouldRhyme = true
let prompt = Prompt {
"Answer the following question from the user: \(userInput)"
if responseShouldRhyme {
"Your response MUST rhyme!"
}
}

If your prompt includes input from people, consider wrapping the input in a string template with your own prompt to better steer the model’s response. For more information on handling inputs in your prompts, see Improving safety from generative model output.

## Topics

### Creating a prompt

`init(_:)`

`struct PromptBuilder`

A type that represents a prompt builder.

`protocol PromptRepresentable`

A protocol that represents a prompt.

## Relationships

### Conforms To

- `Copyable`
- `PromptRepresentable`
- `Sendable`
- `SendableMetatype`

## See Also

### Prompting

`class LanguageModelSession`

An object that represents a session that interacts with a large language model.

Beta

`struct Instructions`

Instructions define the model’s intended behavior on prompts.

`struct Transcript`

A transcript that documents interactions with a language model.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/transcript

- Foundation Models
- Transcript Beta

Structure

# Transcript

A transcript that documents interactions with a language model.

struct Transcript

## Mentioned in

Generating content and performing tasks with Foundation Models

## Topics

### Creating a transcript

[`init(entries: [Transcript.Entry])`](https://developer.apple.com/documentation/foundationmodels/transcript/init(entries:))

Creates a transcript.

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

`enum Entry`

An entry in a transcript.

`enum Segment`

The types of segments that may be included in a transcript entry.

### Getting the transcript entries

[`var entries: [Transcript.Entry]`](https://developer.apple.com/documentation/foundationmodels/transcript/entries)

A ordered list of entries, representing inputs to and outputs from the model.

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

`struct Prompt`

A prompt from the user asking the model.

`struct Response`

A response from the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct StructuredSegment`

A segment containing structured content.

`struct TextSegment`

A segment containing text.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolDefinition`

A definition of a tool.

`struct ToolOutput`

A tool output provided

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing a transcript

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `Decodable`
- `Encodable`
- `Equatable`
- `Sendable`
- `SendableMetatype`

## See Also

### Prompting

`class LanguageModelSession`

An object that represents a session that interacts with a large language model.

Beta

Instructions define the model’s intended behavior on prompts.

A prompt from a person to the model.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/generationoptions

- Foundation Models
- GenerationOptions Beta

Structure

# GenerationOptions

Options that control how the model generates its response to a prompt.

struct GenerationOptions

## Mentioned in

Generating content and performing tasks with Foundation Models

## Overview

Create a `GenerationOptions` structure when you want to adjust the way the model generates its response. Use this structure to perform various adjustments on how the model chooses output tokens, to specify the penalties for repeating tokens or generating longer responses.

## Topics

### Creating options

`init(sampling: GenerationOptions.SamplingMode?, temperature: Double?, maximumResponseTokens: Int?)`

Creates generation options that control token sampling behavior.

### Configuring the response tokens

`var maximumResponseTokens: Int?`

The maximum number of tokens the model is allowed to produce in its response.

### Configuring the sampling mode

`var sampling: GenerationOptions.SamplingMode?`

A sampling strategy for how the model picks tokens when generating a response.

`struct SamplingMode`

A type that defines how values are sampled from a probability distribution.

### Configuring the temperature

`var temperature: Double?`

Temperature influences the confidence of the models response.

### Comparing generation options

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Equatable`
- `Sendable`
- `SendableMetatype`

## See Also

### Prompting

`class LanguageModelSession`

An object that represents a session that interacts with a large language model.

Beta

`struct Instructions`

Instructions define the model’s intended behavior on prompts.

`struct Prompt`

A prompt from a person to the model.

`struct Transcript`

A transcript that documents interactions with a language model.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/generating-swift-data-structures-with-guided-generation

- Foundation Models
- Generating Swift data structures with guided generation

Article

# Generating Swift data structures with guided generation

Create robust apps by describing output you want programmatically.

## Overview

When you perform a request, the model returns a raw string in its natural language format. Raw strings require you to manually parse the details you want. Instead of working with raw strings, the framework provides guided generation, which gives strong guarantees that the response is in a format you expect.

To use guided generation, describe the output you want as a new Swift type. When you make a request to the model, include your custom type and the framework performs the work necessary to fill in and return an object with the parameters filled in for you. The framework uses constrained sampling when generating output, which defines the rules on what the model can generate. Constrained sampling prevents the model from producing malformed output and provides you with results as a type you define.

For more information about creating a session and prompting the model, see Generating content and performing tasks with Foundation Models.

## Conform your data type to Generable

To conform your type to `Generable`, describe the type and the parameters to guide the response of the model. The framework supports generating content with basic Swift types like `Bool`, `Int`, `Float`, `Double`, `Decimal`, and `Array`. For example, if you only want the model to return a numeric result, call `respond(to:generating:includeSchemaInPrompt:options:isolation:)` using the type `Float`:

let prompt = "How many tablespoons are in a cup?"
let session = LanguageModelSession(model: .default)

// Generate a response with the type `Float`, instead of `String`.
let response = try await session.respond(to: prompt, generating: Float.self)

A schema provides the ability to control the values of a property, and you can specify guides to control values you associate with it. The framework provides two macros that help you with schema creation. Use `Generable(description:)` on structures, actors, and enumerations; and only use `Guide(description:)` with stored properties.

When you add descriptions to `Generable` properties, you help the model understand the semantics of the properties. Keep the descriptions as short as possible — long descriptions take up additional context size and can introduce latency. The following example creates a type that describes a cat and includes a name, an age that’s constrained to a range of values, and a short profile:

@Generable(description: "Basic profile information about a cat")
struct CatProfile {
// A guide isn't necessary for basic fields.
var name: String

@Guide(description: "The age of the cat", .range(0...20))
var age: Int

@Guide(description: "A one sentence profile about the cat's personality")
var profile: String
}

You can nest custom `Generable` types inside other `Generable` types, and mark enumerations with associated values as `Generable`. The `Generable` macro ensures that all associated and nested values are themselves generable. This allows for advanced use cases like creating complex data types or dynamically generating views at runtime.

## Make a request with your custom data type

After creating your type, use it along with a `LanguageModelSession` to prompt the model. When you use a `Generable` type it prevents the model from producing malformed output and prevents the need for any manual string parsing.

// Generate a response using a custom type.
let response = try await session.respond(
to: "Generate a cute rescue cat",
generating: CatProfile.self
)

## Define a dynamic schema at runtime

If you don’t know what you want the model to produce at compile time use `DynamicGenerationSchema` to define what you need. For example, when you’re working on a restaurant app and want to restrict the model to pick from menu options that a restaurant provides. Because each restaurant provides a different menu, the schema won’t be known in its entirety until runtime.

// Create the dynamic schema at runtime.
let menuSchema = DynamicGenerationSchema(
name: "Menu",
properties: [\
DynamicGenerationSchema.Property(\
name: "dailySoup",\
schema: DynamicGenerationSchema(\
name: "dailySoup",\
anyOf: ["Tomato", "Chicken Noodle", "Clam Chowder"]\
)\
)\
\
// Add additional properties.\
]
)

After creating a dynamic schema, use it to create a `GenerationSchema` that you provide with your request. When you try to create a generation schema, it can throw an error if there are conflicting property names, undefined references, or duplicate types.

// Create the schema.
let schema = try GenerationSchema(root: menuSchema, dependencies: [])

// Pass the schema to the model to guide the output.
let response = try await session.respond(
to: "The prompt you want to make.",
schema: schema
)

The response you get is an instance of `GeneratedContent`. You can decode the outputs from schemas you define at runtime by calling `value(_:forProperty:)` for the property you want.

## See Also

### Guided generation

`protocol Generable`

A type that the model uses when responding to prompts.

Beta

---

# https://developer.apple.com/documentation/foundationmodels/generable

- Foundation Models
- Generable Beta

Protocol

# Generable

A type that the model uses when responding to prompts.

protocol Generable : ConvertibleFromGeneratedContent, ConvertibleToGeneratedContent

## Mentioned in

Generating Swift data structures with guided generation

## Overview

Annotate your Swift structure or enumeration with the `@Generable` macro to allow the model to respond to prompts by generating an instance of your type. Use the `@Guide` macro to provide natural language descriptions of your properties, and programmatically control the values that the model can generate.

@Generable
struct SearchSuggestions {
@Guide(description: "A list of suggested search terms", .count(4))
var searchTerms: [SearchTerm]

@Generable
struct SearchTerm {
// Use a generation identifier for types the framework generates.
var id: GenerationID

@Guide(description: "A 2 or 3 word search term, like 'Beautiful sunsets'")
var searchTerm: String
}
}

## Topics

### Defining a generable type

`macro Generable(description: String?)`

Conforms a type to generable.

### Creating a guide

`macro Guide(description: String)`

Allows for influencing the allowed values of properties of a generable type.

`macro Guide(description:_:)`

`struct GenerationGuide`

Guides that control how values are generated.

### Getting the schema

`static var generationSchema: GenerationSchema`

An instance of the generation schema.

**Required**

`struct GenerationSchema`

A type that describes the properties of an object and any guides on their values.

### Generating a unique identifier

`struct GenerationID`

A unique identifier that is stable for the duration of a response, but not across responses.

### Converting to partially generated

The partially generated type of this struct.

`associatedtype PartiallyGenerated : ConvertibleFromGeneratedContent = Self`

A representation of partially generated content

**Required** Default implementation provided.

### Generate dynamic shemas

`struct DynamicGenerationSchema`

The dynamic counterpart to the generation schema type that you use to construct schemas at runtime.

## Relationships

### Inherits From

- `ConvertibleFromGeneratedContent`
- `ConvertibleToGeneratedContent`
- `InstructionsRepresentable`
- `PromptRepresentable`

### Conforming Types

- `GeneratedContent`

## See Also

### Guided generation

Create robust apps by describing output you want programmatically.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/expanding-generation-with-tool-calling

- Foundation Models
- Expanding generation with tool calling

Article

# Expanding generation with tool calling

Build tools that enable the model to perform tasks that are specific to your use case.

## Overview

Tools provide a way to extend the functionality of the model for your own use cases. Tool-calling allows the model to interact with external code you create to fetch up-to-date information, ground responses in sources of truth that you provide, and perform side effects, like turning on dark mode.

You can create tools that enable the model to:

- Query entries from your app’s database and reference them in its answer.

- Perform actions within your app, like adjusting the difficulty in a game or making a web request to get additional information.

- Integrate with other frameworks, like Contacts or HealthKit, that use existing privacy and security mechanisms.

## Create a custom tool for your task

When you prompt the model with a question or make a request, the model decides whether it can provide an answer or if it needs the help of a tool. When the model determines that a tool can help, it calls the tool with additional arguments that the tool can use. After the tool completes the task, it returns control and contains the arguments that the tool accepts, and a method that the model calls when it wants to use the tool. You can call `call(arguments:)` concurrently with itself or with other tools. The following example shows a tool that accepts a search term and a number of recipes to retrieve:

struct BreadDatabaseTool: Tool {
let name = "searchBreadDatabase"
let description = "Searches a local database for bread recipes."

@Generable
struct Arguments {
@Guide(description: "The type of bread to search for")
var searchTerm: String
@Guide(description: "The number of recipes to get", .range(1...6))
var limit: Int
}

struct Recipe {
var name: String
var description: String
var link: URL
}

var recipes: [Recipe] = []

// Put your code here to retrieve a list of recipes from your database.

let formattedRecipes = recipes.map {
"Recipe for '\($0.name)': \($0.description) Link: \($0.link)"
}
return ToolOutput(GeneratedContent(properties: ["recipes": formattedRecipes]))
}
}

When you provide descriptions to generable properties, you help the model understand the semantics of the arguments. Keep descriptions as short as possible because long descriptions take up context size and can introduce latency.

Tools use guided generation for the `Arguments` property. For more information about guided generation, see Generating Swift data structures with guided generation.

## Provide a session with the tool you create

When you create a session, you can provide a list of tools that are relevant to the task you want to complete. The tools you provide are available for all future interactions with the session. The following example initializes a session with a tool that the model can call when it determines that it would help satisfy the prompt:

let session = LanguageModelSession(
tools: [BreadDatabaseTool()]
)

let response = try await session.respond(
to: "Find three sourdough bread recipes"
)

Tool output can be a string, or a `GeneratedContent` object. The model can call a tool multiple times in parallel to satisfy the request, like when retrieving weather details for several cities:

struct WeatherTool: Tool {
let name = "getWeather"
let description = "Retrieve the latest weather information for a city"

@Generable
struct Arguments {
@Guide(description: "The city to get weather information for")
var city: String
}

struct Forecast: Encodable {
var city: String
var temperature: Int
}

var temperature = "unknown"
// Get the temperature for the city by using `WeatherKit`.
let forecast = GeneratedContent(properties: [\
"city": arguments.city,\
"temperature": temperature,\
])
return ToolOutput(forecast)
}
}

// Create a session with default instructions that guide the requests.
let session = LanguageModelSession(
tools: [WeatherTool()],
instructions: "Help the person with getting weather information"
)

// Make a request that compares the temperature between several locations.
let response = try await session.respond(
to: "Is it hotter in Boston, Wichita, or Pittsburgh?"
)

## Handle errors thrown by a tool

When an error happens during tool calling, the session throws a `LanguageModelSession.ToolCallError` with the underlying error and includes the tool that throws the error. This helps you understand the error that happened during the tool call, and any custom error types that your tool produces. You can throw errors from your tools to escape calls when you detect something is wrong, like when the person using your app doesn’t allow access to the required data or a network call is taking longer than expected. Alternatively, your tool can return a string `ToolOutput` that briefly tells the model what didn’t work, like “Cannot access the database.”

do {
let answer = try await session.respond("Find a recipe for tomato soup.")
} catch let error as LanguageModelSession.ToolCallError {

// Access the name of the tool, like BreadDatabaseTool.
print(error.tool.name)

// Access an underlying error that your tool throws and check if the tool
// encounters a specific condition.
if case .databaseIsEmpty = error.underlyingError as? SearchBreadDatabaseToolError {
// Display an error in the UI.
}

} catch {
print("Some other error: \(error)")
}

## Inspect the call graph

A session contains an observable `transcript` property that allows you to track when, and how many times, the model calls your tools. A transcript also provides the ability to construct a representation of the call graph for debugging purposes and pairs well with SwiftUI to visualize session history.

struct MyHistoryView: View {

@State
var session = LanguageModelSession(
tools: [BreadDatabaseTool()]
)

var body: some View {
List(session.transcript) { entry in
switch entry {
case .instructions(let instructions):
// Display the instructions the model uses.
case .prompt(let prompt):
// Display the prompt made to the model.
case .toolCall(let call):
// Display the call details for a tool, like the tool name and arguments.
case .toolOutput(let output):
// Display the output that a tool provides

### Tool calling

Generate dynamic game content with guided generation and tools

Make gameplay more lively with AI generated dialog and encounters personalized to the player.

`protocol Tool`

A tool that a model can call to gather information at runtime or perform side effects.

Beta

---

# https://developer.apple.com/documentation/foundationmodels/generate-dynamic-game-content-with-guided-generation-and-tools

- Foundation Models
- Generate dynamic game content with guided generation and tools Beta

Sample Code

# Generate dynamic game content with guided generation and tools

Make gameplay more lively with AI generated dialog and encounters personalized to the player.

Download

Xcode 26.0+Beta

## Overview

## See Also

### Tool calling

Expanding generation with tool calling

Build tools that enable the model to perform tasks that are specific to your use case.

`protocol Tool`

A tool that a model can call to gather information at runtime or perform side effects.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelfeedbackattachment

- Foundation Models
- LanguageModelFeedbackAttachment Beta

Structure

# LanguageModelFeedbackAttachment

Feedback appropriate for attaching to Feedback Assistant.

struct LanguageModelFeedbackAttachment

## Mentioned in

Improving safety from generative model output

## Overview

Use this type to build out user feedback experiences in your app. After collecting feedback, serialize them into a JSON or JSONL file and submit it to Apple using Feedback Assistant. This type supports simple thumbs up or down feedback experiences, all the way to experiences that ask people to compare multiple outputs and explain their preferences.

The following code shows creating a `LanguageModelFeedbackAttachment` using the session transcript to find the input for the provided input. Then, it encodes the data for you to use when submitting feedback.

private func submitFeedback(entry: Transcript.Entry, positive: Bool) {
// Create a feedback object with the model input, output, and a sentiment value.
let feedback = LanguageModelFeedbackAttachment(
input: Array(session.trancript.entries.prefix(while: { $0 != entry })),
output: [entry],
sentiment: positive ? .positive : .negative
)

// Convert the feed

### Creating feedback

[`init(input: [Transcript.Entry], output: [Transcript.Entry], sentiment: LanguageModelFeedbackAttachment.Sentiment?, issues: [LanguageModelFeedbackAttachment.Issue], desiredOutputExamples: [[Transcript.Entry]])`](https://developer.apple.com/documentation/foundationmodels/languagemodelfeedbackattachment/init(input:output:sentiment:issues:desiredoutputexamples:))

Creates feedback from a person regarding a single transcript.

`enum Sentiment`

A sentiment regarding the model’s response.

`struct Issue`

An issue with the model’s response.

Creates feedback from a person that indicates their preference among several outputs generated for the same input.

### Encoding feedback

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

## Relationships

### Conforms To

- `Encodable`
- `Sendable`
- `SendableMetatype`

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/tool)



---

# https://developer.apple.com/documentation/foundationmodels/generating-content-and-performing-tasks-with-foundation-models)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/improving-safety-from-generative-model-output)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/adding-intelligent-app-features-with-generative-models)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel)



---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession)



---

# https://developer.apple.com/documentation/foundationmodels/instructions)



---

# https://developer.apple.com/documentation/foundationmodels/prompt)



---

# https://developer.apple.com/documentation/foundationmodels/transcript)



---

# https://developer.apple.com/documentation/foundationmodels/generationoptions)



---

# https://developer.apple.com/documentation/foundationmodels/generating-swift-data-structures-with-guided-generation)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/generable)



---

# https://developer.apple.com/documentation/foundationmodels/expanding-generation-with-tool-calling)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/generate-dynamic-game-content-with-guided-generation-and-tools)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelfeedbackattachment)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/generationerror/exceededcontextwindowsize(_:)

#app-main)

- Foundation Models
- LanguageModelSession
- LanguageModelSession.GenerationError
- LanguageModelSession.GenerationError.exceededContextWindowSize(\_:) Beta

Case

# LanguageModelSession.GenerationError.exceededContextWindowSize(\_:)

An error that indicates the transcript or a prompt exceeded the model’s context window size.

case exceededContextWindowSize(LanguageModelSession.GenerationError.Context)

## Discussion

Start a new session or try again with a shorter prompt.

## See Also

### Generation errors

`case assetsUnavailable(LanguageModelSession.GenerationError.Context)`

An error that indicates the assets required for the session are unavailable.

Beta

`case decodingFailure(LanguageModelSession.GenerationError.Context)`

An error that indicates the session failed to deserialize a valid generable type from model output.

`case guardrailViolation(LanguageModelSession.GenerationError.Context)`

An error that indicates the system’s safety guardrails are triggered by content in a prompt or the response generated by the model.

`case unsupportedGuide(LanguageModelSession.GenerationError.Context)`

An error that indicates a generation guide with an unsupported pattern was used.

`struct Context`

The context in which the error occurred.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/init(model:guardrails:tools:instructions:)

#app-main)

- Foundation Models
- LanguageModelSession
- init(model:guardrails:tools:instructions:) Beta

Initializer

# init(model:guardrails:tools:instructions:)

Start a new session in blank slate state with instructions builder.

convenience init(
model: SystemLanguageModel = .default,
guardrails: LanguageModelSession.Guardrails = .default,
tools: [any Tool] = [],

) rethrows

Show all declarations

## Discussion

- Parameters

- model: The language model to use for this session.

- guardrails: Controls the guardrails setting for prompt and response filtering. System guardrails is enabled if not specified.

- tools: Tools to make available to the model for this session.

- instructions: Instructions that control the model’s behavior.

## See Also

### Creating a session

`class SystemLanguageModel`

An on-device large language model capable of text generation tasks.

Beta

`struct Guardrails`

Guardrails flag sensitive content from model input and output.

`protocol Tool`

A tool that a model can call to gather information at runtime or perform side effects.

`struct Instructions`

Instructions define the model’s intended behavior on prompts.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/guardrails

- Foundation Models
- LanguageModelSession
- LanguageModelSession.Guardrails Beta

Structure

# LanguageModelSession.Guardrails

Guardrails flag sensitive content from model input and output.

struct Guardrails

## Topics

### Getting the guardrail types

``static let `default`: LanguageModelSession.Guardrails``

A type that indicates the system provides the guardrails.

### Handling guardrail errors

`case guardrailViolation(LanguageModelSession.GenerationError.Context)`

An error that indicates the system’s safety guardrails are triggered by content in a prompt or the response generated by the model.

## Relationships

### Conforms To

- `Sendable`
- `SendableMetatype`

## See Also

### Creating a session

`convenience(model:guardrails:tools:instructions:)`

Start a new session in blank slate state with instructions builder.

Beta

`class SystemLanguageModel`

An on-device large language model capable of text generation tasks.

`protocol Tool`

A tool that a model can call to gather information at runtime or perform side effects.

`struct Instructions`

Instructions define the model’s intended behavior on prompts.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/prewarm()

#app-main)

- Foundation Models
- LanguageModelSession
- prewarm() Beta

Instance Method

# prewarm()

Requests that the system eagerly load the resources required for this session into memory.

final func prewarm()

## Discussion

Consider calling this method when you need to immediately use the session.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/isresponding

- Foundation Models
- LanguageModelSession
- isResponding Beta

Instance Property

# isResponding

A Boolean value that indicates a response is being generated.

final var isResponding: Bool { get }

## Mentioned in

Generating content and performing tasks with Foundation Models

## Discussion

## See Also

### Inspecting session properties

`var transcript: Transcript`

A full history of interactions, including user inputs and model responses.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/transcript

- Foundation Models
- LanguageModelSession
- transcript Beta

Instance Property

# transcript

A full history of interactions, including user inputs and model responses.

final var transcript: Transcript { get }

## Mentioned in

Expanding generation with tool calling

## See Also

### Inspecting session properties

`var isResponding: Bool`

A Boolean value that indicates a response is being generated.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(generating:options:includeschemainprompt:isolation:prompt:)

#app-main)

- Foundation Models
- LanguageModelSession
- respond(generating:options:includeSchemaInPrompt:isolation:prompt:) Beta

Instance Method

# respond(generating:options:includeSchemaInPrompt:isolation:prompt:)

Produces a generable object as a response to a prompt.

@discardableResult

generating type: Content.Type = Content.self,
options: GenerationOptions = GenerationOptions(),
includeSchemaInPrompt: Bool = true,
isolation: isolated (any Actor)? = #isolation,

## Parameters

`type`

A type to produce as the response.

`options`

Options that control how tokens are sampled from the distribution the model produces.

`includeSchemaInPrompt`

Inject the schema into the prompt to bias the model.

`prompt`

A prompt for the model to respond to.

## Return Value

`GeneratedContent` containing the fields and values defined in the schema.

## Discussion

Consider using the default value of `true` for `includeSchemaInPrompt`. The exception to the rule is when the model has knowledge about the expected response format, either because it has been trained on it, or because it has seen exhaustive examples during this session.

## See Also

### Generating a request

Produces a response to a prompt.

Beta

Produces a generated content type as a response to a prompt and schema.

`func respond(to:generating:includeSchemaInPrompt:options:isolation:)`

`func respond(to:options:isolation:)`

`func respond(to:schema:includeSchemaInPrompt:options:isolation:)`

`struct Prompt`

A prompt from a person to the model.

`struct Response`

A structure that stores the output of a response call.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(options:isolation:prompt:)

#app-main)

- Foundation Models
- LanguageModelSession
- respond(options:isolation:prompt:) Beta

Instance Method

# respond(options:isolation:prompt:)

Produces a response to a prompt.

@discardableResult
final func respond(
options: GenerationOptions = GenerationOptions(),
isolation: isolated (any Actor)? = #isolation,

## Parameters

`options`

GenerationOptions that control how tokens are sampled from the distribution the model produces.

`prompt`

A prompt for the model to respond to.

## Return Value

A string composed of the tokens produced by sampling model output.

## See Also

### Generating a request

Produces a generable object as a response to a prompt.

Beta

Produces a generated content type as a response to a prompt and schema.

`func respond(to:generating:includeSchemaInPrompt:options:isolation:)`

`func respond(to:options:isolation:)`

`func respond(to:schema:includeSchemaInPrompt:options:isolation:)`

`struct Prompt`

A prompt from a person to the model.

`struct Response`

A structure that stores the output of a response call.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(options:schema:includeschemainprompt:isolation:prompt:)

#app-main)

- Foundation Models
- LanguageModelSession
- respond(options:schema:includeSchemaInPrompt:isolation:prompt:) Beta

Instance Method

# respond(options:schema:includeSchemaInPrompt:isolation:prompt:)

Produces a generated content type as a response to a prompt and schema.

@discardableResult
final func respond(
options: GenerationOptions = GenerationOptions(),
schema: GenerationSchema,
includeSchemaInPrompt: Bool = true,
isolation: isolated (any Actor)? = #isolation,

## Parameters

`options`

Options that control how tokens are sampled from the distribution the model produces.

`schema`

A schema to guide the output with.

`includeSchemaInPrompt`

Inject the schema into the prompt to bias the model.

`prompt`

A prompt for the model to respond to.

## Return Value

`GeneratedContent` containing the fields and values defined in the schema.

## Discussion

Consider using the default value of `true` for `includeSchemaInPrompt`. The exception to the rule is when the model has knowledge about the expected response format, either because it has been trained on it, or because it has seen exhaustive examples during this session.

## See Also

### Generating a request

Produces a generable object as a response to a prompt.

Beta

Produces a response to a prompt.

`func respond(to:generating:includeSchemaInPrompt:options:isolation:)`

`func respond(to:options:isolation:)`

`func respond(to:schema:includeSchemaInPrompt:options:isolation:)`

`struct Prompt`

A prompt from a person to the model.

`struct Response`

A structure that stores the output of a response call.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(to:generating:includeschemainprompt:options:isolation:)

#app-main)

- Foundation Models
- LanguageModelSession
- respond(to:generating:includeSchemaInPrompt:options:isolation:) Beta

Instance Method

# respond(to:generating:includeSchemaInPrompt:options:isolation:)

Produces a generable object as a response to a prompt.

@discardableResult

to prompt: Prompt,
generating type: Content.Type = Content.self,
includeSchemaInPrompt: Bool = true,
options: GenerationOptions = GenerationOptions(),
isolation: isolated (any Actor)? = #isolation

Show all declarations

## Parameters

`prompt`

A prompt for the model to respond to.

`type`

A type to produce as the response.

`includeSchemaInPrompt`

Inject the schema into the prompt to bias the model.

`options`

Options that control how tokens are sampled from the distribution the model produces.

## Return Value

`GeneratedContent` containing the fields and values defined in the schema.

## Discussion

Consider using the default value of `true` for `includeSchemaInPrompt`. The exception to the rule is when the model has knowledge about the expected response format, either because it has been trained on it, or because it has seen exhaustive examples during this session.

## See Also

### Generating a request

Beta

Produces a response to a prompt.

Produces a generated content type as a response to a prompt and schema.

`func respond(to:options:isolation:)`

`func respond(to:schema:includeSchemaInPrompt:options:isolation:)`

`struct Prompt`

A prompt from a person to the model.

`struct Response`

A structure that stores the output of a response call.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(to:options:isolation:)

#app-main)

- Foundation Models
- LanguageModelSession
- respond(to:options:isolation:) Beta

Instance Method

# respond(to:options:isolation:)

Produces a response to a prompt.

@discardableResult
final func respond(
to prompt: Prompt,
options: GenerationOptions = GenerationOptions(),
isolation: isolated (any Actor)? = #isolation

Show all declarations

## Parameters

`prompt`

A prompt for the model to respond to.

`options`

GenerationOptions that control how tokens are sampled from the distribution the model produces.

## Return Value

A string composed of the tokens produced by sampling model output.

## See Also

### Generating a request

Produces a generable object as a response to a prompt.

Beta

Produces a generated content type as a response to a prompt and schema.

`func respond(to:generating:includeSchemaInPrompt:options:isolation:)`

`func respond(to:schema:includeSchemaInPrompt:options:isolation:)`

`struct Prompt`

A prompt from a person to the model.

`struct Response`

A structure that stores the output of a response call.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(to:schema:includeschemainprompt:options:isolation:)

#app-main)

- Foundation Models
- LanguageModelSession
- respond(to:schema:includeSchemaInPrompt:options:isolation:) Beta

Instance Method

# respond(to:schema:includeSchemaInPrompt:options:isolation:)

Produces a generated content type as a response to a prompt and schema.

@discardableResult
final func respond(
to prompt: Prompt,
schema: GenerationSchema,
includeSchemaInPrompt: Bool = true,
options: GenerationOptions = GenerationOptions(),
isolation: isolated (any Actor)? = #isolation

Show all declarations

## Parameters

`prompt`

A prompt for the model to respond to.

`schema`

A schema to guide the output with.

`includeSchemaInPrompt`

Inject the schema into the prompt to bias the model.

`options`

Options that control how tokens are sampled from the distribution the model produces.

## Return Value

`GeneratedContent` containing the fields and values defined in the schema.

## Discussion

Consider using the default value of `true` for `includeSchemaInPrompt`. The exception to the rule is when the model has knowledge about the expected response format, either because it has been trained on it, or because it has seen exhaustive examples during this session.

## See Also

### Generating a request

Produces a generable object as a response to a prompt.

Beta

Produces a response to a prompt.

`func respond(to:generating:includeSchemaInPrompt:options:isolation:)`

`func respond(to:options:isolation:)`

`struct Prompt`

A prompt from a person to the model.

`struct Response`

A structure that stores the output of a response call.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/response

- Foundation Models
- LanguageModelSession
- LanguageModelSession.Response Beta

Structure

# LanguageModelSession.Response

A structure that stores the output of a response call.

## Topics

### Getting the response content

`let content: Content`

The response content.

### Getting the trascript entries

The list of transcript entries.

## See Also

### Generating a request

Produces a generable object as a response to a prompt.

Beta

Produces a response to a prompt.

Produces a generated content type as a response to a prompt and schema.

`func respond(to:generating:includeSchemaInPrompt:options:isolation:)`

`func respond(to:options:isolation:)`

`func respond(to:schema:includeSchemaInPrompt:options:isolation:)`

`struct Prompt`

A prompt from a person to the model.

`struct GenerationOptions`

Options that control how the model generates its response to a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(to:options:)

#app-main)

- Foundation Models
- LanguageModelSession
- streamResponse(to:options:) Beta

Instance Method

# streamResponse(to:options:)

Produces a response stream to a prompt.

final func streamResponse(
to prompt: Prompt,
options: GenerationOptions = GenerationOptions()

Show all declarations

## Parameters

`prompt`

A specific prompt for the model to respond to.

`options`

GenerationOptions that control how tokens are sampled from the distribution the model produces.

## Return Value

A response stream that produces aggregated tokens.

## See Also

### Streaming a response

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

Produces a response stream to a prompt and schema.

Beta

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct ResponseStream`

A structure that stores the output of a response stream.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(to:generating:includeschemainprompt:options:)

#app-main)

- Foundation Models
- LanguageModelSession
- streamResponse(to:generating:includeSchemaInPrompt:options:) Beta

Instance Method

# streamResponse(to:generating:includeSchemaInPrompt:options:)

Produces a response stream to a prompt and schema.

to prompt: Prompt,
generating type: Content.Type = Content.self,
includeSchemaInPrompt: Bool = true,
options: GenerationOptions = GenerationOptions()

Show all declarations

## Parameters

`prompt`

A prompt for the model to respond to.

`type`

A type to produce as the response.

`includeSchemaInPrompt`

Inject the schema into the prompt to bias the model.

`options`

Options that control how tokens are sampled from the distribution the model produces.

## Return Value

A response stream that produces `GeneratedContent` containing the fields and values defined in the schema.

## Discussion

Consider using the default value of `true` for `includeSchemaInPrompt`. The exception to the rule is when the model has knowledge about the expected response format, either because it has been trained on it, or because it has seen exhaustive examples during this session.

## See Also

### Streaming a response

`func streamResponse(to:options:)`

Produces a response stream to a prompt.

Beta

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct ResponseStream`

A structure that stores the output of a response stream.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(to:schema:includeschemainprompt:options:)

#app-main)

- Foundation Models
- LanguageModelSession
- streamResponse(to:schema:includeSchemaInPrompt:options:) Beta

Instance Method

# streamResponse(to:schema:includeSchemaInPrompt:options:)

Produces a response stream to a prompt and schema.

final func streamResponse(
to prompt: Prompt,
schema: GenerationSchema,
includeSchemaInPrompt: Bool = true,
options: GenerationOptions = GenerationOptions()

Show all declarations

## Parameters

`prompt`

A prompt for the model to respond to.

`schema`

A schema to guide the output with.

`includeSchemaInPrompt`

Inject the schema into the prompt to bias the model.

`options`

Options that control how tokens are sampled from the distribution the model produces.

## Return Value

A response stream that produces `GeneratedContent` containing the fields and values defined in the schema.

## Discussion

Consider using the default value of `true` for `includeSchemaInPrompt`. The exception to the rule is when the model has knowledge about the expected response format, either because it has been trained on it, or because it has seen exhaustive examples during this session.

## See Also

### Streaming a response

`func streamResponse(to:options:)`

Produces a response stream to a prompt.

Beta

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct ResponseStream`

A structure that stores the output of a response stream.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(generating:options:includeschemainprompt:prompt:)

#app-main)

- Foundation Models
- LanguageModelSession
- streamResponse(generating:options:includeSchemaInPrompt:prompt:) Beta

Instance Method

# streamResponse(generating:options:includeSchemaInPrompt:prompt:)

Produces a response stream for a type.

generating type: Content.Type = Content.self,
options: GenerationOptions = GenerationOptions(),
includeSchemaInPrompt: Bool = true,

## Parameters

`type`

A type to produce as the response.

`options`

Options that control how tokens are sampled from the distribution the model produces.

`includeSchemaInPrompt`

Inject the schema into the prompt to bias the model.

## Return Value

A response stream.

## Discussion

Consider using the default value of `true` for `includeSchemaInPrompt`. The exception to the rule is when the model has knowledge about the expected response format, either because it has been trained on it, or because it has seen exhaustive examples during this session.

## See Also

### Streaming a response

`func streamResponse(to:options:)`

Produces a response stream to a prompt.

Beta

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

Produces a response stream to a prompt and schema.

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

`struct ResponseStream`

A structure that stores the output of a response stream.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(options:schema:includeschemainprompt:prompt:)

#app-main)

- Foundation Models
- LanguageModelSession
- streamResponse(options:schema:includeSchemaInPrompt:prompt:) Beta

Instance Method

# streamResponse(options:schema:includeSchemaInPrompt:prompt:)

Produces a response stream to a prompt and schema.

final func streamResponse(
options: GenerationOptions = GenerationOptions(),
schema: GenerationSchema,
includeSchemaInPrompt: Bool = true,

## Parameters

`options`

Options that control how tokens are sampled from the distribution the model produces.

`schema`

A schema to guide the output with.

`includeSchemaInPrompt`

Inject the schema into the prompt to bias the model.

`prompt`

A prompt for the model to respond to.

## Return Value

A response stream that produces `GeneratedContent` containing the fields and values defined in the schema.

## Discussion

Consider using the default value of `true` for `includeSchemaInPrompt`. The exception to the rule is when the model has knowledge about the expected response format, either because it has been trained on it, or because it has seen exhaustive examples during this session.

## See Also

### Streaming a response

`func streamResponse(to:options:)`

Produces a response stream to a prompt.

Beta

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct ResponseStream`

A structure that stores the output of a response stream.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(options:prompt:)

#app-main)

- Foundation Models
- LanguageModelSession
- streamResponse(options:prompt:) Beta

Instance Method

# streamResponse(options:prompt:)

Produces a response stream to a prompt.

final func streamResponse(
options: GenerationOptions = GenerationOptions(),

## Parameters

`options`

GenerationOptions that control how tokens are sampled from the distribution the model produces.

`prompt`

A specific prompt for the model to respond to.

## Return Value

A response stream that produces aggregated tokens.

## See Also

### Streaming a response

`func streamResponse(to:options:)`

Beta

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

Produces a response stream to a prompt and schema.

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct ResponseStream`

A structure that stores the output of a response stream.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/responsestream

- Foundation Models
- LanguageModelSession
- LanguageModelSession.ResponseStream Beta

Structure

# LanguageModelSession.ResponseStream

A structure that stores the output of a response stream.

## Topics

### Collecting the response stream

The result from a streaming response, after it completes.

## Relationships

### Conforms To

- `AsyncSequence`
- `Copyable`

## See Also

### Streaming a response

`func streamResponse(to:options:)`

Produces a response stream to a prompt.

Beta

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

Produces a response stream to a prompt and schema.

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/generatedcontent

- Foundation Models
- GeneratedContent Beta

Structure

# GeneratedContent

A type that represents structured, generated content.

struct GeneratedContent

## Mentioned in

Expanding generation with tool calling

Generating Swift data structures with guided generation

## Overview

Generated content may contain a single value, an ordered collection of properties, or an ordered collection of values.

## Topics

### Creating generated values

`init(_:)`

Creates an object with the content you specify.

Creates an object with an array of elements you specify.

Creates an object with the properties you specify.

### Accessing the properties

Reads the properties of a top level object

### Getting the debug description

`var debugDescription: String`

A string representation for the debug description.

### Reads a value from the concrete type

Reads a top level, concrete partially generable type.

`func value(_:forProperty:)`

Reads a concrete generable type from named property.

### Retrieving the schema and content

`static var generationSchema: GenerationSchema`

An instance of the generation schema.

`var generatedContent: GeneratedContent`

A representation of this instance.

`typealias PartiallyGenerated`

A representation of partially generated content

### Getting the elements and generated content

Reads a top level array of content.

### Comparing generated content

Returns a Boolean value indicating whether two values are equal.

### Getting the unique generation id

`var id: GenerationID?`

A unique ID used for the duration of a generated response.

## Relationships

### Conforms To

- `ConvertibleFromGeneratedContent`
- `ConvertibleToGeneratedContent`
- `CustomDebugStringConvertible`
- `Equatable`
- `Generable`
- `InstructionsRepresentable`
- `PromptRepresentable`
- `Sendable`
- `SendableMetatype`

## See Also

### Streaming a response

`func streamResponse(to:options:)`

Produces a response stream to a prompt.

Beta

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

Produces a response stream to a prompt and schema.

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct ResponseStream`

A structure that stores the output of a response stream.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/convertiblefromgeneratedcontent

- Foundation Models
- ConvertibleFromGeneratedContent Beta

Protocol

# ConvertibleFromGeneratedContent

A type that can be initialized from generated content.

protocol ConvertibleFromGeneratedContent

## Topics

### Creating a convertable

`init(GeneratedContent) throws`

Creates an instance with the content.

**Required**

## Relationships

### Inherited By

- `Generable`

### Conforming Types

- `GeneratedContent`

## See Also

### Streaming a response

`func streamResponse(to:options:)`

Produces a response stream to a prompt.

Beta

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

Produces a response stream to a prompt and schema.

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct ResponseStream`

A structure that stores the output of a response stream.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleToGeneratedContent`

A type that can be converted to generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/convertibletogeneratedcontent

- Foundation Models
- ConvertibleToGeneratedContent Beta

Protocol

# ConvertibleToGeneratedContent

A type that can be converted to generated content.

protocol ConvertibleToGeneratedContent : InstructionsRepresentable, PromptRepresentable

## Topics

### Getting the generated content

`var generatedContent: GeneratedContent`

An instance that represents the generated content.

**Required**

## Relationships

### Inherits From

- `InstructionsRepresentable`
- `PromptRepresentable`

### Inherited By

- `Generable`

### Conforming Types

- `GeneratedContent`

## See Also

### Streaming a response

`func streamResponse(to:options:)`

Produces a response stream to a prompt.

Beta

`func streamResponse(to:generating:includeSchemaInPrompt:options:)`

Produces a response stream to a prompt and schema.

`func streamResponse(to:schema:includeSchemaInPrompt:options:)`

Produces a response stream for a type.

`struct ResponseStream`

A structure that stores the output of a response stream.

`struct GeneratedContent`

A type that represents structured, generated content.

`protocol ConvertibleFromGeneratedContent`

A type that can be initialized from generated content.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/generationerror

- Foundation Models
- LanguageModelSession
- LanguageModelSession.GenerationError Beta

Enumeration

# LanguageModelSession.GenerationError

An error that occurs while generating a response.

enum GenerationError

## Topics

### Generation errors

`case assetsUnavailable(LanguageModelSession.GenerationError.Context)`

An error that indicates the assets required for the session are unavailable.

`case decodingFailure(LanguageModelSession.GenerationError.Context)`

An error that indicates the session failed to deserialize a valid generable type from model output.

`case exceededContextWindowSize(LanguageModelSession.GenerationError.Context)`

An error that indicates the transcript or a prompt exceeded the model’s context window size.

`case guardrailViolation(LanguageModelSession.GenerationError.Context)`

An error that indicates the system’s safety guardrails are triggered by content in a prompt or the response generated by the model.

`case unsupportedGuide(LanguageModelSession.GenerationError.Context)`

An error that indicates a generation guide with an unsupported pattern was used.

`struct Context`

The context in which the error occurred.

### Getting the error description

`var errorDescription: String`

A string representation of the error description.

### Getting the failure reason

`var failureReason: String?`

A string representation of the failure reason.

### Getting the recovery suggestion

`var recoverySuggestion: String?`

A string representation of the recovery suggestion.

### Enumeration Cases

`case unsupportedLanguageOrLocale(LanguageModelSession.GenerationError.Context)`

An error that indicates an error that occurs if the model is prompted to respond in a language that it does not support.

## Relationships

### Conforms To

- `Error`
- `LocalizedError`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the error types

`struct ToolCallError`

An error that occurs while a system language model is calling a tool.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/toolcallerror

- Foundation Models
- LanguageModelSession
- LanguageModelSession.ToolCallError Beta

Structure

# LanguageModelSession.ToolCallError

An error that occurs while a system language model is calling a tool.

struct ToolCallError

## Mentioned in

Expanding generation with tool calling

## Topics

### Creating a tool call error

`init(tool: any Tool, underlyingError: any Error)`

Creates a tool call error

### Getting the tool

`var tool: any Tool`

The tool that produced the error.

### Getting the error description

`var errorDescription: String?`

A string representation of the error description.

### Getting the underlying error

`var underlyingError: any Error`

The underlying error that was thrown during a tool call.

## Relationships

### Conforms To

- `Error`
- `LocalizedError`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the error types

`enum GenerationError`

An error that occurs while generating a response.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/generationerror/exceededcontextwindowsize(_:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/init(model:guardrails:tools:instructions:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/guardrails)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/init(model:guardrails:tools:transcript:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/prewarm())

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/isresponding)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/transcript)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(generating:options:includeschemainprompt:isolation:prompt:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(options:isolation:prompt:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(options:schema:includeschemainprompt:isolation:prompt:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(to:generating:includeschemainprompt:options:isolation:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(to:options:isolation:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(to:schema:includeschemainprompt:options:isolation:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/response)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(to:options:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(to:generating:includeschemainprompt:options:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(to:schema:includeschemainprompt:options:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(generating:options:includeschemainprompt:prompt:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(options:schema:includeschemainprompt:prompt:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/streamresponse(options:prompt:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/responsestream)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/generatedcontent)



---

# https://developer.apple.com/documentation/foundationmodels/convertiblefromgeneratedcontent)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/convertibletogeneratedcontent)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/generationerror)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/toolcallerror)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/instructions/init(_:)

#app-main)

- Foundation Models
- Instructions
- init(\_:) Beta

Initializer

# init(\_:)

Show all declarations

## See Also

### Creating instructions

`struct InstructionsBuilder`

A type that represents an instructions builder.

Beta

`protocol InstructionsRepresentable`

Conforming types represent instructions.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/instructionsbuilder

- Foundation Models
- InstructionsBuilder Beta

Structure

# InstructionsBuilder

A type that represents an instructions builder.

@resultBuilder
struct InstructionsBuilder

## Topics

### Building instructions

Creates a builder with the an array of prompts.

Creates a builder with the a block.

Creates a builder with the first component.

Creates a builder with the second component.

`static buildExpression(_:)`

Creates a builder with a prompt expression.

Creates a builder with a limited availability prompt.

Creates a builder with an optional component.

## See Also

### Creating instructions

`init(_:)` Beta

`protocol InstructionsRepresentable`

Conforming types represent instructions.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/instructionsrepresentable

- Foundation Models
- InstructionsRepresentable Beta

Protocol

# InstructionsRepresentable

Conforming types represent instructions.

protocol InstructionsRepresentable

## Topics

### Getting the representation

`var instructionsRepresentation: Instructions`

An instance that represents the instructions.

**Required** Default implementation provided.

## Relationships

### Inherited By

- `ConvertibleToGeneratedContent`
- `Generable`

### Conforming Types

- `GeneratedContent`
- `Instructions`

## See Also

### Creating instructions

`init(_:)` Beta

`struct InstructionsBuilder`

A type that represents an instructions builder.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/instructions/instructionsrepresentable-implementations

Collection

- Foundation Models
- Instructions
- InstructionsRepresentable Implementations

API Collection

# InstructionsRepresentable Implementations

## Topics

### Instance Properties

`var instructionsRepresentation: Instructions`

An instance that represents the instructions.

Beta

---

# https://developer.apple.com/documentation/foundationmodels/improving-safety-from-generative-model-output).

.#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/instructions/init(_:))



---

# https://developer.apple.com/documentation/foundationmodels/instructionsbuilder)



---

# https://developer.apple.com/documentation/foundationmodels/instructionsrepresentable)



---

# https://developer.apple.com/documentation/foundationmodels/instructions/instructionsrepresentable-implementations)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/default

- Foundation Models
- SystemLanguageModel
- default Beta

Type Property

# default

The base version of the model.

static let `default`: SystemLanguageModel

## Mentioned in

Generating content and performing tasks with Foundation Models

## Discussion

The base model is a generic model that is useful for a wide variety of applications, but is not specialized to any particular use case.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(to:options:isolation:)-4z2jz

-4z2jz#app-main)

- Foundation Models
- LanguageModelSession
- respond(to:options:isolation:) Beta

Instance Method

# respond(to:options:isolation:)

Produces a response to a prompt.

@discardableResult
final func respond(
to prompt: String,
options: GenerationOptions = GenerationOptions(),
isolation: isolated (any Actor)? = #isolation

Show all declarations

## Parameters

`prompt`

A prompt for the model to respond to.

`options`

GenerationOptions that control how tokens are sampled from the distribution the model produces.

## Return Value

A string composed of the tokens produced by sampling model output.

## Mentioned in

Generating content and performing tasks with Foundation Models

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/default)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/respond(to:options:isolation:)-4z2jz)

-4z2jz)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/generating-swift-data-structures-with-guided-generation).

.#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession).



---

# https://developer.apple.com/documentation/foundationmodels/prompt/init(_:)

#app-main)

- Foundation Models
- Prompt
- init(\_:) Beta

Initializer

# init(\_:)

Show all declarations

## See Also

### Creating a prompt

`struct PromptBuilder`

A type that represents a prompt builder.

Beta

`protocol PromptRepresentable`

A protocol that represents a prompt.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/promptbuilder

- Foundation Models
- PromptBuilder Beta

Structure

# PromptBuilder

A type that represents a prompt builder.

@resultBuilder
struct PromptBuilder

## Topics

### Building a prompt

Creates a builder with the an array of prompts.

Creates a builder with the a block.

Creates a builder with the first component.

Creates a builder with the second component.

`static buildExpression(_:)`

Creates a builder with a prompt expression.

Creates a builder with a limited availability prompt.

Creates a builder with an optional component.

## See Also

### Creating a prompt

`init(_:)` Beta

`protocol PromptRepresentable`

A protocol that represents a prompt.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/promptrepresentable

- Foundation Models
- PromptRepresentable Beta

Protocol

# PromptRepresentable

A protocol that represents a prompt.

protocol PromptRepresentable

## Topics

### Getting the representation

`var promptRepresentation: Prompt`

An instance that represents a prompt.

**Required** Default implementation provided.

## Relationships

### Inherited By

- `ConvertibleToGeneratedContent`
- `Generable`

### Conforming Types

- `GeneratedContent`
- `Prompt`

## See Also

### Creating a prompt

`init(_:)` Beta

`struct PromptBuilder`

A type that represents a prompt builder.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/prompt/promptrepresentable-implementations

Collection

- Foundation Models
- Prompt
- PromptRepresentable Implementations

API Collection

# PromptRepresentable Implementations

## Topics

### Instance Properties

`var promptRepresentation: Prompt`

An instance that represents a prompt.

Beta

---

# https://developer.apple.com/documentation/foundationmodels/prompt/init(_:))



---

# https://developer.apple.com/documentation/foundationmodels/promptbuilder)



---

# https://developer.apple.com/documentation/foundationmodels/promptrepresentable)



---

# https://developer.apple.com/documentation/foundationmodels/prompt/promptrepresentable-implementations)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase/contenttagging

- Foundation Models
- SystemLanguageModel
- SystemLanguageModel.UseCase
- contentTagging Beta

Type Property

# contentTagging

A use case for content tagging.

static let contentTagging: SystemLanguageModel.UseCase

## Discussion

Content tagging produces a list of categorizing tags based on the input prompt. When specializing the model for the `contentTagging` use case, it always responds with tags. The tagging capabilities of the model include detecting topics, emotions, actions, and objects.

// Create an instance of the model with the content tagging use case.
let model = SystemLanguageModel(useCase: .contentTagging)

// Initialize a session with the model.
let session = LanguageModelSession(model: model)

If you don’t provide `Instructions` to the session, the model generates topic-related tags by default. To generate other kinds of tags, like emotions, actions, or objects, specify the kind of tag either in instructions or in a `Generable` output type.

let instructions = """
Tag the three most important actions, emotions, objects, \
and topics in the given input text
"""

The code below prompts the model to respond about a picnic at the beach with tags like “outdoor activity,” “beach,” and “picnic”:

let prompt = """
Today we had a lovely picnic with friends at the beach.
"""
let response = try await session.respond(
to: prompt,
generating: ContentTaggingResult.self
)

Content tagging works best if you define an output structure using guided generation. The code below uses `Generable` guide descriptions to specify the kinds and quantities of tags the model should produce:

@Generable
struct ContentTaggingResult {
@Guide(
description: "Most important actions in the input text",
.maximumCount(3)
)
let actions: [String]
@Guide(
description: "Most important emotions in the input text",
.maximumCount(3)
)
let emotions: [String]
@Guide(
description: "Most important objects in the input text",
.maximumCount(3)
)
let objects: [String]
@Guide(
description: "Most important topics in the input text",
.maximumCount(3)
)
let topics: [String]
}

## See Also

### Getting the use cases

`static let general: SystemLanguageModel.UseCase`

A use case for general prompting.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum

- Foundation Models
- SystemLanguageModel
- SystemLanguageModel.Availability Beta

Enumeration

# SystemLanguageModel.Availability

The availability status for a specific system language model.

@frozen
enum Availability

## Topics

### Checking for availability

`case available`

The system is ready for making requests.

`case unavailable(SystemLanguageModel.Availability.UnavailableReason)`

Indicates that the system is not ready for requests.

`enum UnavailableReason`

The unavailable reason.

### Comparing availability

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Equatable`
- `Sendable`
- `SendableMetatype`

## See Also

### Checking model availability

`var isAvailable: Bool`

A convenience getter to check if the system is entirely ready.

Beta

`var availability: SystemLanguageModel.Availability`

The availability of the language model.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/init(usecase:)

#app-main)

- Foundation Models
- SystemLanguageModel
- init(useCase:) Beta

Initializer

# init(useCase:)

Creates a system language model for a specific use case.

convenience init(useCase: SystemLanguageModel.UseCase)

## See Also

### Loading the model with a use case

`struct UseCase`

A type that represents the use case for prompting.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/init(adapter:)

#app-main)

- Foundation Models
- SystemLanguageModel
- init(adapter:) Beta

Initializer

# init(adapter:)

Creates the base version of the model with an adapter.

convenience init(adapter: SystemLanguageModel.Adapter)

## See Also

### Loading the model with an adapter

`struct Adapter`

Specializes the system language model for custom use cases.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/adapter

- Foundation Models
- SystemLanguageModel
- SystemLanguageModel.Adapter Beta

Structure

# SystemLanguageModel.Adapter

Specializes the system language model for custom use cases.

struct Adapter

## Overview

Use the base system model for most prompt engineering, guided generation, and tools. If you need to specialize the model, train a custom `Adapter` to alter the system model weights and optimize it for your custom task. Use custom adapters only if you’re comfortable training foundation models in Python.

For more on custom adapters, see adapter training toolkit.

## Topics

### Creating an adapter

`init(fileURL: URL) throws`

Creates an adapter from the file URL.

`init(name: String) throws`

Creates an adapter downloaded from the background assets framework.

### Getting the metadata

[`let creatorDefinedMetadata: [String : Any]`](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/adapter/creatordefinedmetadata)

Values read from the creator defined field of the adapter’s metadata.

### Removing obsolete adapters

`static func removeObsoleteAdapters()`

Remove all obsolete adapters that are no longer compatible with current system models.

### Checking compatibility

Get all compatible adapter identifiers compatible with current system models.

Returns true when an asset pack is an Foundation Models Adapter and compatible with current system base model.

### Getting the asset error

`enum AssetError`

## See Also

### Loading the model with an adapter

`convenience init(adapter: SystemLanguageModel.Adapter)`

Creates the base version of the model with an adapter.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/isavailable

- Foundation Models
- SystemLanguageModel
- isAvailable Beta

Instance Property

# isAvailable

A convenience getter to check if the system is entirely ready.

final var isAvailable: Bool { get }

## See Also

### Checking model availability

`var availability: SystemLanguageModel.Availability`

The availability of the language model.

Beta

`enum Availability`

The availability status for a specific system language model.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.property

- Foundation Models
- SystemLanguageModel
- availability Beta

Instance Property

# availability

The availability of the language model.

final var availability: SystemLanguageModel.Availability { get }

## See Also

### Checking model availability

`var isAvailable: Bool`

A convenience getter to check if the system is entirely ready.

Beta

`enum Availability`

The availability status for a specific system language model.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/supportedlanguages

- Foundation Models
- SystemLanguageModel
- supportedLanguages Beta

Instance Property

# supportedLanguages

Languages supported by the model.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase/contenttagging).

.#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.enum)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/init(usecase:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/init(adapter:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/adapter)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/isavailable)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/availability-swift.property)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/supportedlanguages)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/transcript/init(from:)

#app-main)

- Foundation Models
- Transcript
- init(from:) Beta

Initializer

# init(from:)

Creates a new instance by decoding from the given decoder.

init(from decoder: any Decoder) throws

## Parameters

`decoder`

The decoder to read data from.

## Discussion

This initializer throws an error if reading from the decoder fails, or if the data read is corrupted or otherwise invalid.

## See Also

### Creating a transcript

[`init(entries: [Transcript.Entry])`](https://developer.apple.com/documentation/foundationmodels/transcript/init(entries:))

Creates a transcript.

Beta

`enum Entry`

An entry in a transcript.

`enum Segment`

The types of segments that may be included in a transcript entry.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/transcript/entry

- Foundation Models
- Transcript
- Transcript.Entry Beta

Enumeration

# Transcript.Entry

An entry in a transcript.

enum Entry

## Topics

### Creating an entry

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

`case instructions(Transcript.Instructions)`

Instructions, typically provided by you, the developer.

`case prompt(Transcript.Prompt)`

A prompt, typically sourced from an end user.

`case response(Transcript.Response)`

A response from the model.

`case toolCalls(Transcript.ToolCalls)`

A tool call containing a tool name and the arguments to invoke it with.

`case toolOutput(Transcript.ToolOutput)`

An tool output provided

`var id: String`

The stable identity of the entity associated with this instance.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

### Encoding an entry

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing entries

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `Sendable`
- `SendableMetatype`

## See Also

### Creating a transcript

[`init(entries: [Transcript.Entry])`](https://developer.apple.com/documentation/foundationmodels/transcript/init(entries:))

Creates a transcript.

Beta

`enum Segment`

The types of segments that may be included in a transcript entry.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/transcript/segment

- Foundation Models
- Transcript
- Transcript.Segment Beta

Enumeration

# Transcript.Segment

The types of segments that may be included in a transcript entry.

enum Segment

## Topics

### Creating a segment

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

`case structure(Transcript.StructuredSegment)`

A segment containing structured content

`case text(Transcript.TextSegment)`

A segment containing text.

### Inspecting a segment

`var id: String`

The stable identity of the entity associated with this instance.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

### Encoding a segment

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing segments

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `Sendable`
- `SendableMetatype`

## See Also

### Creating a transcript

[`init(entries: [Transcript.Entry])`](https://developer.apple.com/documentation/foundationmodels/transcript/init(entries:))

Creates a transcript.

Beta

`enum Entry`

An entry in a transcript.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/transcript/instructions

- Foundation Models
- Transcript
- Transcript.Instructions Beta

Structure

# Transcript.Instructions

Instructions you provide to the model that define its behavior.

struct Instructions

## Overview

Instructions are typically provided to define the role and behavior of the model. Apple trains the model to obey instructions over any commands it receives in prompts. This is a security mechanism to help mitigate prompt injection attacks.

## Topics

### Creating instructions

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

[`init(id: String, segments: [Transcript.Segment], toolDefinitions: [Transcript.ToolDefinition])`](https://developer.apple.com/documentation/foundationmodels/transcript/instructions/init(id:segments:tooldefinitions:))

Initialize instructions by describing how you want the model to behave using natural language.

### Inspecting instructions

`var id: String`

The stable identity of the entity associated with this instance.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

[`var segments: [Transcript.Segment]`](https://developer.apple.com/documentation/foundationmodels/transcript/instructions/segments)

The content of the instructions, in natural language.

[`var toolDefinitions: [Transcript.ToolDefinition]`](https://developer.apple.com/documentation/foundationmodels/transcript/instructions/tooldefinitions)

A list of tools made available to the model.

### Encoding instructions

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing instructions

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the transcript types

`struct Prompt`

A prompt from the user asking the model.

Beta

`struct Response`

A response from the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct StructuredSegment`

A segment containing structured content.

`struct TextSegment`

A segment containing text.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolDefinition`

A definition of a tool.

`struct ToolOutput`

A tool output provided

---

# https://developer.apple.com/documentation/foundationmodels/transcript/prompt

- Foundation Models
- Transcript
- Transcript.Prompt Beta

Structure

# Transcript.Prompt

A prompt from the user asking the model.

struct Prompt

## Topics

### Creating a prompt

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

[`init(id: String, segments: [Transcript.Segment], options: GenerationOptions, responseFormat: Transcript.ResponseFormat?)`](https://developer.apple.com/documentation/foundationmodels/transcript/prompt/init(id:segments:options:responseformat:))

Creates a prompt.

### Inspecting a prompt

`var id: String`

The identifier of the prompt.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

`var responseFormat: Transcript.ResponseFormat?`

An optional response format that describes the desired output structure.

[`var segments: [Transcript.Segment]`](https://developer.apple.com/documentation/foundationmodels/transcript/prompt/segments)

Ordered prompt segments, often interleaved text and images.

`var options: GenerationOptions`

Generation options associated with the prompt.

### Encoding a prompt

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing prompts

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

Beta

`struct Response`

A response from the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct StructuredSegment`

A segment containing structured content.

`struct TextSegment`

A segment containing text.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolDefinition`

A definition of a tool.

`struct ToolOutput`

A tool output provided

---

# https://developer.apple.com/documentation/foundationmodels/transcript/response

- Foundation Models
- Transcript
- Transcript.Response Beta

Structure

# Transcript.Response

A response from the model.

struct Response

## Topics

### Creating a response

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

[`init(id: String, assetIDs: [String], segments: [Transcript.Segment])`](https://developer.apple.com/documentation/foundationmodels/transcript/response/init(id:assetids:segments:))

### Inspecting a response

`var id: String`

The stable identity of the entity associated with this instance.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

[`var segments: [Transcript.Segment]`](https://developer.apple.com/documentation/foundationmodels/transcript/response/segments)

Ordered prompt segments, often interleaved text and images.

[`var assetIDs: [String]`](https://developer.apple.com/documentation/foundationmodels/transcript/response/assetids)

Version aware identifiers for all assets used to generate this response.

### Encoding a response

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing responses

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

Beta

`struct Prompt`

A prompt from the user asking the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct StructuredSegment`

A segment containing structured content.

`struct TextSegment`

A segment containing text.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolDefinition`

A definition of a tool.

`struct ToolOutput`

A tool output provided

---

# https://developer.apple.com/documentation/foundationmodels/transcript/responseformat

- Foundation Models
- Transcript
- Transcript.ResponseFormat Beta

Structure

# Transcript.ResponseFormat

Specifies a response format that the model must conform its output to.

struct ResponseFormat

## Topics

### Creating a response format

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

`init(schema: GenerationSchema)`

Creates a response format with a schema.

Creates a response format with type you specify.

### Inspecting a response format

`var name: String`

A name associated with the response format.

### Encoding a response format

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing response formats

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

Beta

`struct Prompt`

A prompt from the user asking the model.

`struct Response`

A response from the model.

`struct StructuredSegment`

A segment containing structured content.

`struct TextSegment`

A segment containing text.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolDefinition`

A definition of a tool.

`struct ToolOutput`

A tool output provided

---

# https://developer.apple.com/documentation/foundationmodels/transcript/structuredsegment

- Foundation Models
- Transcript
- Transcript.StructuredSegment Beta

Structure

# Transcript.StructuredSegment

A segment containing structured content.

struct StructuredSegment

## Topics

### Creating a structured segment

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

`init(id: String, source: String, content: GeneratedContent)`

### Inspecting a structured segment

`let content: GeneratedContent`

The content of the segment.

`var id: String`

The stable identity of the entity associated with this instance.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

`var source: String`

A source that be used to understand which type content represents.

### Encoding a structured segment

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing structured segments

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

Beta

`struct Prompt`

A prompt from the user asking the model.

`struct Response`

A response from the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct TextSegment`

A segment containing text.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolDefinition`

A definition of a tool.

`struct ToolOutput`

A tool output provided

---

# https://developer.apple.com/documentation/foundationmodels/transcript/textsegment

- Foundation Models
- Transcript
- Transcript.TextSegment Beta

Structure

# Transcript.TextSegment

A segment containing text.

struct TextSegment

## Topics

### Creating a text segment

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

`init(id: String, content: String)`

### Inspecting a text segment

`var content: String`

`var id: String`

The stable identity of the entity associated with this instance.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

### Encoding a text segment

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing text segments

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

Beta

`struct Prompt`

A prompt from the user asking the model.

`struct Response`

A response from the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct StructuredSegment`

A segment containing structured content.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolDefinition`

A definition of a tool.

`struct ToolOutput`

A tool output provided

---

# https://developer.apple.com/documentation/foundationmodels/transcript/toolcall

- Foundation Models
- Transcript
- Transcript.ToolCall Beta

Structure

# Transcript.ToolCall

A tool call generated by the model containing the name of a tool and arguments to pass to it.

struct ToolCall

## Topics

### Creating a tool call

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

### Inspecting a tool call

`var arguments: GeneratedContent`

Arguments to pass to the invoked tool.

`var id: String`

The stable identity of the entity associated with this instance.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

`var toolName: String`

The name of the tool being invoked.

### Encoding a tool call

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing tool call

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

Beta

`struct Prompt`

A prompt from the user asking the model.

`struct Response`

A response from the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct StructuredSegment`

A segment containing structured content.

`struct TextSegment`

A segment containing text.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolDefinition`

A definition of a tool.

`struct ToolOutput`

A tool output provided

---

# https://developer.apple.com/documentation/foundationmodels/transcript/toolcalls

- Foundation Models
- Transcript
- Transcript.ToolCalls Beta

Structure

# Transcript.ToolCalls

A collection tool calls generated by the model.

struct ToolCalls

## Topics

### Creating a tool calls

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

### Inspecting a tool calls

`var endIndex: Int`

The collection’s “past the end” position—that is, the position one greater than the last valid subscript argument.

`var id: String`

The stable identity of the entity associated with this instance.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

`var startIndex: Int`

The position of the first element in a nonempty collection.

### Getting the types

`typealias Element`

A type representing the sequence’s elements.

`typealias Index`

A type that represents a position in the collection.

`typealias Indices`

A type that represents the indices that are valid for subscripting the collection, in ascending order.

`typealias Iterator`

A type that provides the collection’s iteration interface and encapsulates its iteration state.

`typealias SubSequence`

A collection representing a contiguous subrange of this collection’s elements. The subsequence shares indices with the original collection.

### Getting the subscript

Accesses the element at the specified position.

### Encoding a tool calls

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing tool calls

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `BidirectionalCollection`
- `Collection`
- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `RandomAccessCollection`
- `Sendable`
- `SendableMetatype`
- `Sequence`

## See Also

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

Beta

`struct Prompt`

A prompt from the user asking the model.

`struct Response`

A response from the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct StructuredSegment`

A segment containing structured content.

`struct TextSegment`

A segment containing text.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolDefinition`

A definition of a tool.

`struct ToolOutput`

A tool output provided

---

# https://developer.apple.com/documentation/foundationmodels/transcript/tooldefinition

- Foundation Models
- Transcript
- Transcript.ToolDefinition Beta

Structure

# Transcript.ToolDefinition

A definition of a tool.

struct ToolDefinition

## Topics

### Creating a tool definition

`init(name: String, description: String, parameters: GenerationSchema)`

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

### Inspecting a tool definition

`var description: String`

A description of how and when to use the tool.

`var name: String`

The tool’s name.

### Encoding a tool definition

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing tool definition

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Equatable`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

Beta

`struct Prompt`

A prompt from the user asking the model.

`struct Response`

A response from the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct StructuredSegment`

A segment containing structured content.

`struct TextSegment`

A segment containing text.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolOutput`

A tool output provided

---

# https://developer.apple.com/documentation/foundationmodels/transcript/tooloutput

- Foundation Models
- Transcript
- Transcript.ToolOutput Beta

Structure

# Transcript.ToolOutput

A tool output provided

### Creating a tool output

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

[`init(id: String, toolName: String, segments: [Transcript.Segment])`](https://developer.apple.com/documentation/foundationmodels/transcript/tooloutput/init(id:toolname:segments:))

### Inspecting a tool output

`var id: String`

A unique id for this tool output.

`typealias ID`

A type representing the stable identity of the entity associated with an instance.

[`var segments: [Transcript.Segment]`](https://developer.apple.com/documentation/foundationmodels/transcript/tooloutput/segments)

Segments of the tool output.

`var toolName: String`

The name of the tool that produced this output.

### Encoding a tool output

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

### Comparing tool outputs

Returns a Boolean value indicating whether two values are equal.

## Relationships

### Conforms To

- `Copyable`
- `CustomStringConvertible`
- `Equatable`
- `Identifiable`
- `Sendable`
- `SendableMetatype`

## See Also

### Getting the transcript types

`struct Instructions`

Instructions you provide to the model that define its behavior.

Beta

`struct Prompt`

A prompt from the user asking the model.

`struct Response`

A response from the model.

`struct ResponseFormat`

Specifies a response format that the model must conform its output to.

`struct StructuredSegment`

A segment containing structured content.

`struct TextSegment`

A segment containing text.

`struct ToolCall`

A tool call generated by the model containing the name of a tool and arguments to pass to it.

`struct ToolCalls`

A collection tool calls generated by the model.

`struct ToolDefinition`

A definition of a tool.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/transcript/encode(to:)

#app-main)

- Foundation Models
- Transcript
- encode(to:) Beta

Instance Method

# encode(to:)

Encodes this value into the given encoder.

func encode(to encoder: any Encoder) throws

## Parameters

`encoder`

The encoder to write data to.

## Discussion

If the value fails to encode anything, `encoder` will encode an empty keyed container in its place.

This function throws an error if any values are invalid for the given encoder’s format.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/transcript/==(_:_:)

#app-main)

- Foundation Models
- Transcript
- ==(\_:\_:) Beta

Operator

# ==(\_:\_:)

Returns a Boolean value indicating whether two values are equal.

## Parameters

`lhs`

A value to compare.

`rhs`

Another value to compare.

## Discussion

Equality is the inverse of inequality. For any values `a` and `b`, `a == b` implies that `a != b` is `false`.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/transcript/decodable-implementations

Collection

- Foundation Models
- Transcript
- Decodable Implementations

API Collection

# Decodable Implementations

## Topics

### Initializers

`init(from: any Decoder) throws`

Creates a new instance by decoding from the given decoder.

Beta

---

# https://developer.apple.com/documentation/foundationmodels/transcript/encodable-implementations

Collection

- Foundation Models
- Transcript
- Encodable Implementations

API Collection

# Encodable Implementations

## Topics

### Instance Methods

`func encode(to: any Encoder) throws`

Encodes this value into the given encoder.

Beta

---

# https://developer.apple.com/documentation/foundationmodels/transcript/equatable-implementations

Collection

- Foundation Models
- Transcript
- Equatable Implementations

API Collection

# Equatable Implementations

## Topics

### Operators

Returns a Boolean value indicating whether two values are not equal.

Beta

---

# https://developer.apple.com/documentation/foundationmodels/transcript/init(entries:))



---

# https://developer.apple.com/documentation/foundationmodels/transcript/init(from:))



---

# https://developer.apple.com/documentation/foundationmodels/transcript/entry)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/segment)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/entries)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/instructions)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/prompt)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/response)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/responseformat)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/structuredsegment)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/transcript/textsegment)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/toolcall)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/toolcalls)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/tooldefinition)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/tooloutput)



---

# https://developer.apple.com/documentation/foundationmodels/transcript/encode(to:))



---

# https://developer.apple.com/documentation/foundationmodels/transcript/==(_:_:))



---

# https://developer.apple.com/documentation/foundationmodels/transcript/decodable-implementations)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/transcript/encodable-implementations)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/transcript/equatable-implementations)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/generationerror/guardrailviolation(_:)

#app-main)

- Foundation Models
- LanguageModelSession
- LanguageModelSession.GenerationError
- LanguageModelSession.GenerationError.guardrailViolation(\_:) Beta

Case

# LanguageModelSession.GenerationError.guardrailViolation(\_:)

An error that indicates the system’s safety guardrails are triggered by content in a prompt or the response generated by the model.

case guardrailViolation(LanguageModelSession.GenerationError.Context)

## Mentioned in

Improving safety from generative model output

## See Also

### Generation errors

`case assetsUnavailable(LanguageModelSession.GenerationError.Context)`

An error that indicates the assets required for the session are unavailable.

Beta

`case decodingFailure(LanguageModelSession.GenerationError.Context)`

An error that indicates the session failed to deserialize a valid generable type from model output.

`case exceededContextWindowSize(LanguageModelSession.GenerationError.Context)`

An error that indicates the transcript or a prompt exceeded the model’s context window size.

`case unsupportedGuide(LanguageModelSession.GenerationError.Context)`

An error that indicates a generation guide with an unsupported pattern was used.

`struct Context`

The context in which the error occurred.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/languagemodelsession/generationerror/guardrailviolation(_:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase/general

- Foundation Models
- SystemLanguageModel
- SystemLanguageModel.UseCase
- general Beta

Type Property

# general

A use case for general prompting.

static let general: SystemLanguageModel.UseCase

## Discussion

This is the default use case for the base version of the model, so if you use `SystemLanguageModel.default`, you don’t need to specify a use case.

## See Also

### Getting the use cases

`static let contentTagging: SystemLanguageModel.UseCase`

A use case for content tagging.

Beta

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase/==(_:_:)

#app-main)

- Foundation Models
- SystemLanguageModel
- SystemLanguageModel.UseCase
- ==(\_:\_:) Beta

Operator

# ==(\_:\_:)

Returns a Boolean value indicating whether two values are equal.

## Parameters

`lhs`

A value to compare.

`rhs`

Another value to compare.

## Discussion

Equality is the inverse of inequality. For any values `a` and `b`, `a == b` implies that `a != b` is `false`.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase/equatable-implementations

Collection

- Foundation Models
- SystemLanguageModel.UseCase
- Equatable Implementations

API Collection

# Equatable Implementations

## Topics

### Operators

Returns a Boolean value indicating whether two values are not equal.

Beta

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase/general)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase/contenttagging)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase/==(_:_:))

)#app-main)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel/usecase/equatable-implementations)

# The page you're looking for can't be found.

Search developer.apple.comSearch Icon

---

# https://developer.apple.com/documentation/foundationmodels/tool/call(arguments:)

#app-main)

- Foundation Models
- Tool
- call(arguments:) Beta

Instance Method

# call(arguments:)

A language model will call this method when it wants to leverage this tool.

**Required**

## Mentioned in

Expanding generation with tool calling

## Discussion

If errors are throw in the body of this method, they will be wrapped in a `LanguageModelSession.ToolCallError` and rethrown at the call site of `LanguageModelSession.respond(to:)`.

## See Also

### Invoking a tool

`struct ToolOutput`

A structure that contains the output a tool generates.

Beta

`associatedtype Arguments : ConvertibleFromGeneratedContent`

The arguments that this tool should accept.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/tooloutput

- Foundation Models
- ToolOutput Beta

Structure

# ToolOutput

A structure that contains the output a tool generates.

struct ToolOutput

## Mentioned in

Expanding generation with tool calling

## Topics

### Creating a tool output

`init(_:)`

Creates a tool output with a generated encodable object.

## Relationships

### Conforms To

- `Sendable`
- `SendableMetatype`

## See Also

### Invoking a tool

A language model will call this method when it wants to leverage this tool.

**Required**

Beta

`associatedtype Arguments : ConvertibleFromGeneratedContent`

The arguments that this tool should accept.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/tool/arguments

- Foundation Models
- Tool
- Arguments Beta

Associated Type

# Arguments

The arguments that this tool should accept.

associatedtype Arguments : ConvertibleFromGeneratedContent

**Required**

## Mentioned in

Expanding generation with tool calling

## Discussion

Typically arguments are either a `Generable` type or `GeneratedContent.`

## See Also

### Invoking a tool

A language model will call this method when it wants to leverage this tool.

Beta

`struct ToolOutput`

A structure that contains the output a tool generates.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/tool/description

- Foundation Models
- Tool
- description Beta

Instance Property

# description

A natural language description of when and how to use the tool.

var description: String { get }

**Required**

## See Also

### Getting the tool properties

`var includesSchemaInInstructions: Bool`

If true, the model’s name, description, and parameters schema will be injected into the instructions of sessions that leverage this tool.

**Required** Default implementation provided.

Beta

`var name: String`

A unique name for the tool, such as “get\_weather”, “toggleDarkMode”, or “search contacts”.

`var parameters: GenerationSchema`

A schema for the parameters this tool accepts.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/tool/includesschemaininstructions

- Foundation Models
- Tool
- includesSchemaInInstructions Beta

Instance Property

# includesSchemaInInstructions

If true, the model’s name, description, and parameters schema will be injected into the instructions of sessions that leverage this tool.

var includesSchemaInInstructions: Bool { get }

**Required** Default implementation provided.

## Discussion

The default implementation is `true`

## Default Implementations

### Tool Implementations

`var includesSchemaInInstructions: Bool`

## See Also

### Getting the tool properties

`var description: String`

A natural language description of when and how to use the tool.

**Required**

Beta

`var name: String`

A unique name for the tool, such as “get\_weather”, “toggleDarkMode”, or “search contacts”.

`var parameters: GenerationSchema`

A schema for the parameters this tool accepts.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/tool/name

- Foundation Models
- Tool
- name Beta

Instance Property

# name

A unique name for the tool, such as “get\_weather”, “toggleDarkMode”, or “search contacts”.

var name: String { get }

**Required** Default implementation provided.

## Default Implementations

### Tool Implementations

`var name: String`

## See Also

### Getting the tool properties

`var description: String`

A natural language description of when and how to use the tool.

**Required**

Beta

`var includesSchemaInInstructions: Bool`

If true, the model’s name, description, and parameters schema will be injected into the instructions of sessions that leverage this tool.

`var parameters: GenerationSchema`

A schema for the parameters this tool accepts.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/tool/parameters

- Foundation Models
- Tool
- parameters Beta

Instance Property

# parameters

A schema for the parameters this tool accepts.

var parameters: GenerationSchema { get }

**Required** Default implementation provided.

## Default Implementations

### Tool Implementations

`var parameters: GenerationSchema`

## See Also

### Getting the tool properties

`var description: String`

A natural language description of when and how to use the tool.

**Required**

Beta

`var includesSchemaInInstructions: Bool`

If true, the model’s name, description, and parameters schema will be injected into the instructions of sessions that leverage this tool.

`var name: String`

A unique name for the tool, such as “get\_weather”, “toggleDarkMode”, or “search contacts”.

Beta Software

This documentation contains preliminary information about an API or technology in development. This information is subject to change, and software implemented according to this documentation should be tested with final operating system software.

Learn more about using Apple's beta software

---

# https://developer.apple.com/documentation/foundationmodels/tool/call(arguments:))



---

# https://developer.apple.com/documentation/foundationmodels/tooloutput)



---

# https://developer.apple.com/documentation/foundationmodels/tool/arguments)



---

# https://developer.apple.com/documentation/foundationmodels/tool/description)



---

