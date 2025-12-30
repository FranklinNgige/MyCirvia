import { createCirvia } from "../../../src/actions/cirvias";

export default function NewCirviaPage() {
  return (
    <main>
      <h1>Create a Cirvia</h1>
      <form action={createCirvia}>
        <label>
          Name
          <input name="name" required />
        </label>
        <label>
          Description
          <textarea name="description" />
        </label>
        <label>
          Visibility
          <select name="visibility" defaultValue="public">
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </label>
        <button type="submit">Create</button>
      </form>
      <p>Invite-only is enabled by default.</p>
    </main>
  );
}
