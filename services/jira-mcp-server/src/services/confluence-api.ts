import type { AppConfig } from "../config.js";
import { basicAuthHeader, requestJson } from "../lib/http.js";

type ConfluenceSpaceListResponse = {
  results?: Array<{
    id?: string;
    key?: string;
    name?: string;
    type?: string;
    status?: string;
    homepageId?: string;
    _links?: {
      base?: string;
      webui?: string;
    };
  }>;
  _links?: {
    base?: string;
  };
};

type ConfluencePageListResponse = {
  results?: Array<ConfluencePageApiEntity>;
  _links?: {
    base?: string;
  };
};

type ConfluencePageApiEntity = {
  id?: string;
  status?: string;
  title?: string;
  spaceId?: string;
  parentId?: string;
  parentType?: string;
  authorId?: string;
  ownerId?: string;
  createdAt?: string;
  version?: {
    number?: number;
    createdAt?: string;
    message?: string;
    authorId?: string;
  };
  body?: {
    storage?: {
      value?: string;
    };
  };
  labels?: {
    results?: Array<{
      id?: string;
      name?: string;
      prefix?: string;
    }>;
  };
  _links?: {
    base?: string;
    webui?: string;
    editui?: string;
    tinyui?: string;
  };
};

type ConfluenceLabelResponse = {
  results?: Array<{
    id?: string;
    name?: string;
    prefix?: string;
    label?: string;
  }>;
};

export type ConfluenceSpace = {
  id: string;
  key?: string;
  name: string;
  type?: string;
  status?: string;
  homepageId?: string;
  webUrl?: string;
};

export type ConfluencePage = {
  id: string;
  title: string;
  status?: string;
  spaceId?: string;
  parentId?: string;
  version?: {
    number?: number;
    message?: string;
    createdAt?: string;
    authorId?: string;
  };
  bodyStorage?: string;
  labels: string[];
  webUrl?: string;
  editUrl?: string;
};

export class ConfluenceApi {
  private readonly baseUrl: string;

  constructor(private readonly config: AppConfig) {
    this.baseUrl =
      this.config.confluenceBaseUrl ?? `${this.config.jiraBaseUrl}/wiki`;
  }

  async listSpaces(limit = 100): Promise<ConfluenceSpace[]> {
    const response = await this.confluenceRequest<ConfluenceSpaceListResponse>(
      `/api/v2/spaces?limit=${limit}`
    );

    return (response.results ?? [])
      .filter((space) => Boolean(space.id && space.name))
      .map((space) => {
        const webUrl = resolveWebUrl(response._links?.base, space._links?.webui);

        return {
          id: space.id as string,
          name: space.name as string,
          ...(space.key ? { key: space.key } : {}),
          ...(space.type ? { type: space.type } : {}),
          ...(space.status ? { status: space.status } : {}),
          ...(space.homepageId ? { homepageId: space.homepageId } : {}),
          ...(webUrl ? { webUrl } : {})
        };
      });
  }

  async listPages(input: {
    spaceId?: string;
    title?: string;
    limit?: number;
    includeBodyStorage?: boolean;
  }): Promise<ConfluencePage[]> {
    const params = new URLSearchParams();
    params.set("limit", String(input.limit ?? 50));
    params.append("status", "current");

    if (input.spaceId) {
      params.append("space-id", input.spaceId);
    }

    if (input.title) {
      params.append("title", input.title);
    }

    if (input.includeBodyStorage) {
      params.append("body-format", "storage");
    }

    const response = await this.confluenceRequest<ConfluencePageListResponse>(
      `/api/v2/pages?${params.toString()}`
    );

    return (response.results ?? [])
      .filter((page) => Boolean(page.id && page.title))
      .map((page) => mapConfluencePage(page, response._links?.base));
  }

  async getPage(pageId: string, includeBodyStorage = true): Promise<ConfluencePage> {
    const params = new URLSearchParams();
    params.append("status", "current");
    params.append("include-labels", "true");

    if (includeBodyStorage) {
      params.append("body-format", "storage");
    }

    const response = await this.confluenceRequest<ConfluencePageApiEntity>(
      `/api/v2/pages/${encodeURIComponent(pageId)}?${params.toString()}`
    );

    return mapConfluencePage(response, response._links?.base);
  }

  async createPage(input: {
    spaceId: string;
    title: string;
    bodyStorage: string;
    parentId?: string;
  }): Promise<ConfluencePage> {
    const response = await this.confluenceRequest<ConfluencePageApiEntity>(
      "/api/v2/pages",
      {
        method: "POST",
        body: JSON.stringify({
          spaceId: input.spaceId,
          status: "current",
          title: input.title,
          ...(input.parentId ? { parentId: input.parentId } : {}),
          body: {
            representation: "storage",
            value: input.bodyStorage
          }
        })
      }
    );

    return mapConfluencePage(response, response._links?.base);
  }

  async updatePage(input: {
    pageId: string;
    title: string;
    bodyStorage: string;
    version: number;
    spaceId?: string;
    parentId?: string;
    message?: string;
  }): Promise<ConfluencePage> {
    const response = await this.confluenceRequest<ConfluencePageApiEntity>(
      `/api/v2/pages/${encodeURIComponent(input.pageId)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          id: input.pageId,
          status: "current",
          title: input.title,
          ...(input.spaceId ? { spaceId: input.spaceId } : {}),
          ...(input.parentId ? { parentId: input.parentId } : {}),
          body: {
            representation: "storage",
            value: input.bodyStorage
          },
          version: {
            number: input.version,
            ...(input.message ? { message: input.message } : {})
          }
        })
      }
    );

    return mapConfluencePage(response, response._links?.base);
  }

  async addLabels(pageId: string, labels: string[]): Promise<string[]> {
    if (labels.length === 0) {
      return [];
    }

    const response = await this.confluenceRequest<ConfluenceLabelResponse>(
      `/rest/api/content/${encodeURIComponent(pageId)}/label`,
      {
        method: "POST",
        body: JSON.stringify(
          labels.map((label) => ({
            prefix: "global",
            name: label
          }))
        )
      }
    );

    return (response.results ?? [])
      .map((item) => item.name)
      .filter((item): item is string => Boolean(item));
  }

  async removeLabel(pageId: string, label: string): Promise<void> {
    const params = new URLSearchParams();
    params.set("name", label);

    await this.confluenceRequest<void>(
      `/rest/api/content/${encodeURIComponent(pageId)}/label?${params.toString()}`,
      {
        method: "DELETE"
      }
    );
  }

  private confluenceRequest<T>(
    path: string,
    init: RequestInit = { method: "GET" }
  ): Promise<T> {
    if (!this.config.confluenceApiToken) {
      throw new Error("Confluence is not configured.");
    }

    return requestJson<T>(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: basicAuthHeader(
          this.config.confluenceEmail ?? this.config.jiraEmail,
          this.config.confluenceApiToken
        ),
        Accept: "application/json",
        "Content-Type": "application/json"
      }
    });
  }
}

function mapConfluencePage(
  page: ConfluencePageApiEntity,
  baseUrl?: string
): ConfluencePage {
  if (!page.id || !page.title) {
    throw new Error("Confluence page response did not include id and title.");
  }

  return {
    id: page.id,
    title: page.title,
    ...(page.status ? { status: page.status } : {}),
    ...(page.spaceId ? { spaceId: page.spaceId } : {}),
    ...(page.parentId ? { parentId: page.parentId } : {}),
    ...(page.version ? { version: page.version } : {}),
    ...(page.body?.storage?.value
      ? { bodyStorage: page.body.storage.value }
      : {}),
    labels: (page.labels?.results ?? [])
      .map((label) => label.name)
      .filter((value): value is string => Boolean(value)),
    ...(resolveWebUrl(baseUrl, page._links?.webui)
      ? { webUrl: resolveWebUrl(baseUrl, page._links?.webui) as string }
      : {}),
    ...(resolveWebUrl(baseUrl, page._links?.editui)
      ? { editUrl: resolveWebUrl(baseUrl, page._links?.editui) as string }
      : {})
  };
}

function resolveWebUrl(baseUrl?: string, path?: string): string | undefined {
  if (!baseUrl || !path) {
    return undefined;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${baseUrl}${path}`;
}
