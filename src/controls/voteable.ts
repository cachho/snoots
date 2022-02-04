import type Client from "../client";

import { Data, RedditObject } from "../helper/types";
import Comment from "../objects/comment";
import ReplyableControls from "./replyable";

/** The vote types. 1 = upvote, 0 = no vote, -1 = downvote. */
export type Vote = 1 | 0 | -1;

/** The base controls for all content that you can vote on. */
export default abstract class VoteableControls extends ReplyableControls {
  /** @internal */
  constructor(client: Client, type: string) {
    super(client, `${type}_`);
  }

  /**
   * Set whether or not inbox replies are enabled for an item.
   *
   * @param id The id of the item.
   * @param enabled Whether or not replies should be enabled.
   *
   * @returns A promise that resolves when the change has been made.
   */
  protected async inboxReplies(id: string, enabled: boolean): Promise<void> {
    const req = { id: this.namespace(id), state: enabled };
    await this.gateway.post("api/sendreplies", req);
  }

  /**
   * Enable inbox replies for an item.
   *
   * @param id The id of the item.
   *
   * @returns A promise that resolves when replies have been enabled.
   */
  async enableInboxReplies(id: string): Promise<void> {
    await this.inboxReplies(id, true);
  }

  /**
   * Disable inbox replies for an item.
   *
   * @param id The id of the item.
   *
   * @returns A promise that resolves when replies have been disabled.
   */
  async disableInboxReplies(id: string): Promise<void> {
    await this.inboxReplies(id, false);
  }

  /**
   * Cast a vote.
   *
   * @param id The ID of the item to vote on.
   * @param vote The vote to cast.
   *
   * @returns A promise that resolves when the vote has been cast.
   */
  protected async vote(id: string, vote: Vote): Promise<void> {
    await this.gateway.post("api/vote", {
      id: this.namespace(id),
      dir: vote,
    });
  }

  /**
   * Cast an upvote.
   *
   * @param id The ID of the item to upvote.
   *
   * @returns A promise that resolves when the vote has been cast.
   */
  async upvote(id: string): Promise<void> {
    await this.vote(id, 1);
  }

  /**
   * Remove your vote.
   *
   * @param id The ID of the item to unvote.
   *
   * @returns A promise that resolves when the vote has been removed.
   */
  async unvote(id: string): Promise<void> {
    await this.vote(id, 0);
  }

  /**
   * Cast a downvote.
   *
   * @param id The ID of the item to downvote.
   *
   * @returns A promise that resolves when the vote has been cast.
   */
  async downvote(id: string): Promise<void> {
    await this.vote(id, -1);
  }

  /**
   * Reply to an item.
   *
   * @param id The ID of the item to reply to.
   * @param text The text content of the reply to post.
   *
   * @returns A promise that resolves to the comment reply.
   */
  async reply(id: string, text: string): Promise<Comment> {
    const rawResponse: Data = await this.replyImpl(id, text);
    const replyComment: RedditObject = rawResponse.things[0];
    if (!replyComment) throw "oh yeah that's definitely not good.";
    return this.client.comments.fromRaw(replyComment);
  }

  /**
   * Save an item.
   *
   * This will make the item show up at reddit.com/saved.
   *
   * @param id The ID of the item to save.
   *
   * @returns a promise that resolves when the item has been saved.
   */
  async save(id: string): Promise<void> {
    await this.gateway.post("api/save", { id: this.namespace(id) });
  }

  /**
   * Unsave an item.
   *
   * This will make the item no longer show up at reddit.com/saved.
   *
   * @param id The ID of the item to unsave.
   *
   * @returns a promise that resolves when the item has been unsaved.
   */
  async unsave(id: string): Promise<void> {
    await this.gateway.post("api/unsave", { id: this.namespace(id) });
  }

  /**
   * Edit an item.
   *
   * @param id The ID of the item to edit.
   * @param newText The new text to use.
   *
   * @returns A promise that resolves when the edit is complete.
   */
  async edit(id: string, newText: string): Promise<void> {
    const body = { thing_id: this.namespace(id), text: newText };
    await this.gateway.post("api/editusertext", body);
  }

  /**
   * Delete an item.
   *
   * @param id The ID of the item to delete.
   *
   * @returns A promise that resolves when the item has been deleted.
   */
  async delete(id: string): Promise<void> {
    await this.gateway.post("api/del", { id: this.namespace(id) });
  }

  /**
   * Approve an item.
   *
   * @note This requires the authenticated user to be a moderator of the
   * subreddit with the `posts` permission.
   *
   * @param id The ID of the item to approve.
   *
   * @returns A promise that resolves when the item has been approved.
   */
  async approve(id: string): Promise<void> {
    await this.gateway.post("api/approve", { id: this.namespace(id) });
  }

  /**
   * Remove an item, optionally marking it as spam.
   *
   * @note This requires the authenticated user to be a moderator of the
   * subreddit with the `posts` permission.
   *
   * @param id The ID of the item to remove.
   * @param spam Whether or not to mark this item as spam. Defaults to false.
   *
   * @returns A promise that resolves when the item has been removed.
   */
  async remove(id: string, spam: boolean = false): Promise<void> {
    await this.gateway.post("api/remove", {
      id: this.namespace(id),
      spam,
    });
  }

  /**
   * Ignore any future reports of an item.
   *
   * @note This requires the authenticated user to be a moderator of the
   * subreddit with the `posts` permission.
   *
   * @param id The ID of the item to ignore reports for.
   *
   * @returns A promise that resolves when the setting has been changed.
   */
  async ignoreFutureReports(id: string): Promise<void> {
    await this.gateway.post("api/ignore_reports", {
      id: this.namespace(id),
    });
  }

  /**
   * Unignore any future reports of an item.
   *
   * @note This requires the authenticated user to be a moderator of the
   * subreddit with the `posts` permission.
   *
   * @param id The ID of the item to unignore reports for.
   *
   * @returns A promise that resolves when the setting has been changed.
   */
  async unignoreFutureReports(id: string): Promise<void> {
    await this.gateway.post("api/unignore_reports", {
      id: this.namespace(id),
    });
  }

  /**
   * Give Reddit gold to the author of an item.
   *
   * @param id The ID of the item to gild.
   *
   * @returns A promise that resolves when the item has been gilded.
   */
  async gild(id: string): Promise<void> {
    await this.gateway.post(`api/v1/gold/gild/${this.namespace(id)}`, {});
  }
}
