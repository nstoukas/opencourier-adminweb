import type {
  AddressNoteAdminDto,
  AddressNoteSearchAdminDto,
} from "../backend-admin-sdk";
import { Tags } from "@/api/utils/tags";
import { api as baseApi, prepareAdminSdk } from ".";
import { AppState } from "@/redux/store";
import { handleBackendError } from "./utils/api";

// Spec 0053 (AC-7): riders' notes about places. Flagged first, then a search by street; an admin
// deletes a note (recorded on the server, text not kept) or dismisses its flags.
export const addressNoteApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getFlaggedAddressNotes: build.query<AddressNoteAdminDto[], void>({
      queryFn: async (_arg, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth;
          const data = await prepareAdminSdk(accessToken || "")
            .addressNotes()
            .flagged();
          return { data };
        } catch (error) {
          return { error: handleBackendError(error, api) };
        }
      },
      providesTags: [Tags.addressNotes],
    }),
    searchAddressNotes: build.query<
      AddressNoteSearchAdminDto,
      { search: string; page: number; perPage: number }
    >({
      queryFn: async (params, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth;
          const data = await prepareAdminSdk(accessToken || "")
            .addressNotes()
            .search(params);
          return { data };
        } catch (error) {
          return { error: handleBackendError(error, api) };
        }
      },
      providesTags: [Tags.addressNotes],
    }),
    // 204: `{ data: null }`, since RTK Query logs an error for `{ data: undefined }`.
    deleteAddressNote: build.mutation<null, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth;
          await prepareAdminSdk(accessToken || "")
            .addressNotes()
            .remove(id);
          return { data: null };
        } catch (error) {
          return { error: handleBackendError(error, api) };
        }
      },
      // A 404 (another admin deleted it first) also changed the lists, so read them again either way.
      invalidatesTags: [Tags.addressNotes],
    }),
    dismissAddressNoteFlags: build.mutation<null, { id: string }>({
      queryFn: async ({ id }, api) => {
        try {
          const { accessToken } = (api.getState() as AppState).auth;
          await prepareAdminSdk(accessToken || "")
            .addressNotes()
            .dismissFlags(id);
          return { data: null };
        } catch (error) {
          return { error: handleBackendError(error, api) };
        }
      },
      invalidatesTags: [Tags.addressNotes],
    }),
  }),
});

export const {
  useGetFlaggedAddressNotesQuery,
  useSearchAddressNotesQuery,
  useDeleteAddressNoteMutation,
  useDismissAddressNoteFlagsMutation,
} = addressNoteApi;
